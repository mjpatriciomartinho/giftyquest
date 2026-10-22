// The simulated Alexa+: Amazon Nova on Bedrock driving the GiftyQuest MCP server.
// It connects as a real MCP client (in-memory transport), so it uses exactly the same tools and
// interview prompt that Alexa+ or any other assistant would get over HTTP.
import {
  BedrockRuntimeClient, ConverseCommand,
  type ContentBlock, type Message, type Tool, type ToolResultContentBlock,
} from "@aws-sdk/client-bedrock-runtime";
import { fromTemporaryCredentials } from "@aws-sdk/credential-providers";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { todayIso } from "../../../shared/dates";
import { buildMcpServer } from "../mcp";
import { amazonConfig, findProducts, taggedSearchUrl, type AmazonProduct } from "../catalog/amazon";
import type { AccountRepo } from "../store/repo";
import { withAccount } from "../store/lock";

export const MODEL_ID = process.env.GQ_MODEL ?? "eu.amazon.nova-2-lite-v1:0";
const REGION = process.env.GQ_BEDROCK_REGION ?? "eu-west-1";
const MAX_STEPS = 12;

// GQ_BEDROCK_ROLE: call Bedrock through a role in another AWS account (the one with Bedrock access).
const BEDROCK_ROLE = process.env.GQ_BEDROCK_ROLE;
const bedrock = new BedrockRuntimeClient({
  region: REGION,
  ...(BEDROCK_ROLE ? { credentials: fromTemporaryCredentials({ params: { RoleArn: BEDROCK_ROLE, RoleSessionName: "giftyquest-alexa" } }) } : {}),
});

export interface Turn { role: "user" | "assistant"; text: string }
export interface GiftIdeaCard { title: string; priceUsd: number; why: string; icon: string; basedOn?: string[]; searchQuery?: string; product?: AmazonProduct | null; searchUrl?: string }
export type Card =
  | { type: "ideas"; person: string; ideas: GiftIdeaCard[] }
  | { type: "checkout"; person: string; title: string; priceUsd: number; icon: string }
  | { type: "receipt"; person: string; title: string; priceUsd: number; order: string };
export interface AlexaReply {
  text: string;
  tools: { name: string; args: unknown; isError: boolean }[];
  cards: Card[];
  /** What to store as this assistant turn in the history: the spoken text plus what was on screen. */
  memory: string;
}

const ICONS = ["armchair", "book-open", "camera", "candy", "chef-hat", "coffee", "dice-5", "disc-3", "dumbbell", "flower-2", "gift", "lamp",
  "moon", "package", "palette", "shovel", "soup", "sparkles", "sun", "ticket", "utensils", "watch", "waves"];

const STORE_LANGUAGE: Record<string, string> = {
  "www.amazon.es": "Spanish", "www.amazon.com": "English", "www.amazon.co.uk": "English", "www.amazon.de": "German",
  "www.amazon.fr": "French", "www.amazon.it": "Italian", "www.amazon.com.mx": "Spanish",
};

// Screen-only tool: draws gift idea cards on the Echo Show style display. Not part of the MCP server.
const showIdeasTool = (storeLanguage: string | null): Tool => ({
  toolSpec: {
    name: "show_gift_cards",
    description: "Show 2 to 4 gift ideas as visual cards on the user's screen. Call it whenever you suggest gifts. Every idea needs a one-sentence reason grounded in the person's profile or hints.",
    inputSchema: {
      json: {
        type: "object",
        properties: {
          person: { type: "string" },
          ideas: {
            type: "array", minItems: 1, maxItems: 4,
            items: {
              type: "object",
              properties: {
                title: { type: "string", description: "Specific product or experience, e.g. 'Handmade ceramic table lamp, sage glaze'" },
                priceUsd: { type: "number" },
                why: { type: "string", description: "One sentence: why it fits this person" },
                icon: { type: "string", enum: ICONS },
                basedOn: { type: "array", items: { type: "string" }, minItems: 2, maxItems: 4, description: "Short labels of the signals combined, e.g. ['powerlifting', 'orange', 'ceramic lamp hint']" },
                ...(storeLanguage ? { searchQuery: { type: "string", description: `Short Amazon search query for this idea, 2 to 5 words, in ${storeLanguage}, e.g. the product type plus one key attribute` } } : {}),
              },
              required: ["title", "priceUsd", "why", "icon", "basedOn", ...(storeLanguage ? ["searchQuery"] : [])],
            },
          },
        },
        required: ["person", "ideas"],
      },
    },
  },
});

function systemPrompt(people: string, interview: string, explore = "", briefing = "") {
  return `You are Alexa, the voice assistant, using the GiftyQuest skill: a gift memory for the people the user loves.
Today is ${todayIso()}. The user's people: ${people}

Voice rules (strict):
- Everything you write is read aloud. Write one to three short sentences of plain speech.
- Never use lists, bullet points, line breaks, markdown or emoji. Never read the cards aloud item by item.

Memory:
- Save anything the user tells you about someone: hints with add_hint, likes, dislikes and allergies with add_preference, dates and sizes with update_profile.
- Refer to people by name. "my girlfriend" or "mom" work as the person argument.
- Never invent facts about a person.

Gift ideas, follow these steps in order:
1. If the user has not said a budget earlier in this conversation, reply only with a short question asking for the budget, and stop. Do not call any tool yet.
2. With a budget, call get_profile and suggest_gifts with maxUsd set to that budget.
3. suggest_gifts returns ideaSeeds: one combination of profile signals per idea. Invent one specific, creative gift per seed that a thoughtful person would really buy, combining at least two of its signals; drop a signal that does not fit naturally. No gimmicks such as food-themed objects. Example: seed ["hint: loved the ceramic lamp at their sister's place", "hobby: Powerlifting", "color: Orange"] could become "a hand-stitched orange leather lifting belt".
4. Every idea must be a real product or experience you could find in a shop today, never a mash-up of materials or themes (a "ceramic light meter" does not exist). Use a hint for what it says about the person, for example "loved a handmade ceramic lamp" means they like handmade, natural things, not that everything should be ceramic. A hint is evidence of taste, not a shopping list: never suggest the same kind of object as the hint (they loved a lamp: no lamp). A brand means a product that brand really makes (Patagonia: outdoor clothing or bags), never another object with the brand's logo or tag. Avoid dislikes, allergies and gifts already given.
5. For each idea, write a one-sentence reason naming what you mixed, and put only the signals you actually used as short labels in basedOn (for example "ceramic lamp hint", "powerlifting", "orange"). Then call show_gift_cards.
6. If the user asks for something different ("more fun", "for the beach"), call suggest_gifts again for fresh seeds and adapt the ideas to the request.
7. Say one sentence like "Here are three ideas on your screen" plus the one you would pick and why.

Buying:
- When the user picks an idea, call start_purchase in that same turn with the exact title and price from the cards, then ask "Should I order it?".
- Only after an explicit yes, call confirm_purchase. Purchases are simulated; never ask for payment details.
- After ordering, do not ask how the gift went. Ask about the reaction only when the user says the gift was already given.

When the conversation starts with the note that the user just opened Alexa, run this briefing:
${briefing}

When the user wants to get to know someone better, explore them, or asks what else you should know, run this flow:
${explore}

When the user wants to add someone new, run this interview. Save each answer with the right tool in the same turn you receive it, then ask the next question. Never save the same thing twice. If the first answer already gives the relationship ("my mom"), do not ask for it again. After the last question, you must call save_guesses with two or three traits before you mention them.
${interview}`;
}

const asText = (r: object) =>
  (((r as { content?: unknown }).content as { type: string; text?: string }[]) ?? []).filter((c) => c.type === "text").map((c) => c.text).join("\n");
// Voice output: drop model reasoning tags and flatten any list the model still writes.
const clean = (t: string) => t
  .replace(/<thinking>[\s\S]*?<\/thinking>/g, "")
  .replace(/\[(Already saved|Cards on screen|Checkout on screen|Order placed|GiftyQuest note)[^\]]*\]/gi, "")
  .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, "")
  .replace(/[*_#`]/g, "")
  .replace(/\s*\n+\s*/g, " ")
  .trim();

/** The first turn when the user opens Alexa: she speaks first, with the briefing. */
export const OPENED = "[GiftyQuest note: the user just opened Alexa and has not said anything yet. Run the briefing.]";

const KEEP_MESSAGES = 40;

/** Keeps the tail of the conversation, starting at a plain user message (Converse requires it). */
function trim(messages: Message[]): Message[] {
  const out = messages.slice(-KEEP_MESSAGES);
  while (out.length && !(out[0].role === "user" && (out[0].content ?? []).some((c) => c.text))) out.shift();
  return out;
}

const ASKS_FOR_IDEAS = /\b(ideas?|suggest|recommend|gifts?|present|what (should|could) i (get|buy)|regalo|regalar)\b/i;
const INTERVIEW = /\b(interview|someone new|new person|add (someone|a person)|know .* better|explore)\b/i;
const HAS_BUDGET = /(\$\s?\d+|\b\d+\s?(dollars|usd|bucks|euros?)\b|\b(under|below|max(imum)?|up to|around)\s+\$?\d+|no (budget|limit)|any budget|sin l[ií]mite)/i;

/** Deterministic steer: the model must ask for a budget before suggesting anything. */
function steer(previous: Message[], message: string): string {
  const said = [...previous.filter((m) => m.role === "user").flatMap((m) => (m.content ?? []).map((c) => c.text ?? "")), message].join(" ");
  if (ASKS_FOR_IDEAS.test(message) && !INTERVIEW.test(message) && !HAS_BUDGET.test(said)) {
    return `${message}\n\n[GiftyQuest note: the user has not given a budget yet. Reply with one short question asking for the budget. Do not suggest any gift and do not call any tool.]`;
  }
  return message;
}

const READ_ONLY = new Set(["list_people", "get_profile", "get_upcoming_dates", "suggest_gifts", "profile_gaps"]);
const SAID_YES = /\b(yes|yeah|yep|sure|confirm|order it|go ahead|do it|buy it|s[ií]|vale)\b/i;
const needsYes = (tool: string, args: Record<string, unknown>) =>
  tool === "confirm_purchase" || (tool === "record_gift" && (args.status === "bought" || args.status === "wrapped"));

function memoryOf(reply: AlexaReply) {
  const shown = reply.cards.map((c) =>
    c.type === "ideas" ? `Cards on screen for ${c.person}: ${c.ideas.map((i, n) => `${n + 1}) ${i.title}, $${i.priceUsd}`).join("; ")}.`
      : c.type === "checkout" ? `Checkout on screen: ${c.title}, $${c.priceUsd}, waiting for yes.`
        : `Order placed: ${c.title}, ${c.order}.`).join(" ");
  // Remember what was already saved, so the model never repeats tool calls in later turns.
  const done = reply.tools.filter((t) => !t.isError && t.name !== "show_gift_cards" && !READ_ONLY.has(t.name))
    .map((t) => `${t.name}(${Object.entries(t.args as Record<string, unknown>).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}=${v}`).join(", ")})`);
  const notes = [done.length ? `Already saved: ${done.join("; ")}.` : "", shown].filter(Boolean).join(" ");
  return notes ? `${reply.text} [${notes}]` : reply.text;
}

export async function runAlexa(repo: AccountRepo, accountId: string, message: string, fresh = false): Promise<AlexaReply> {
  const server = buildMcpServer(repo, accountId);
  const client = new Client({ name: "giftyquest-alexa-sim", version: "0.1.0" });
  const [clientSide, serverSide] = InMemoryTransport.createLinkedPair();
  await server.connect(serverSide);
  await client.connect(clientSide);

  try {
    const { tools } = await client.listTools();
    const prompt = await client.getPrompt({ name: "gift_interview", arguments: {} });
    const interview = prompt.messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join("\n");
    const explorePrompt = await client.getPrompt({ name: "explore_person", arguments: {} });
    const explore = explorePrompt.messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join("\n");
    const briefingPrompt = await client.getPrompt({ name: "daily_briefing", arguments: {} });
    const briefing = briefingPrompt.messages.map((m) => (m.content.type === "text" ? m.content.text : "")).join("\n");
    const people = asText(await client.callTool({ name: "list_people", arguments: {} }));

    const store = await amazonConfig();
    const storeLanguage = store ? STORE_LANGUAGE[store.marketplace] ?? "English" : null;
    const toolConfig = {
      tools: [
        ...tools.map((t): Tool => ({ toolSpec: { name: t.name, description: t.description ?? "", inputSchema: { json: t.inputSchema as never } } })),
        showIdeasTool(storeLanguage),
      ],
    };
    let budget: number | null = null;

    const previous = fresh ? [] : trim(((await repo.get(accountId))?.alexa ?? []) as Message[]);
    const messages: Message[] = [...previous, { role: "user", content: [{ text: steer(previous, message) }] }];
    const saidByUser = [...previous.filter((m) => m.role === "user").flatMap((m) => (m.content ?? []).map((c) => c.text ?? "")), message].join(" ");
    const reply: AlexaReply = { text: "", tools: [], cards: [], memory: "" };

    for (let step = 0; step < MAX_STEPS; step++) {
      const res = await bedrock.send(new ConverseCommand({
        modelId: MODEL_ID,
        system: [{ text: systemPrompt(people, interview, explore, briefing) }],
        messages,
        toolConfig,
        inferenceConfig: { maxTokens: 900, temperature: 0.5 },
      }));
      const out = res.output?.message;
      if (!out) break;
      messages.push(out);
      const text = clean((out.content ?? []).map((c) => c.text ?? "").join(" "));
      if (text) reply.text = reply.text ? `${reply.text} ${text}` : text;
      if (res.stopReason !== "tool_use") break;

      const results: ContentBlock[] = [];
      for (const block of out.content ?? []) {
        const use = block.toolUse;
        if (!use?.name || !use.toolUseId) continue;
        const args = (use.input ?? {}) as Record<string, unknown>;
        let content: ToolResultContentBlock[];
        let isError = false;

        if (use.name === "show_gift_cards") {
          const a = args as { person: string; ideas: GiftIdeaCard[] };
          const ideas = (a.ideas ?? []).map((i) => ({ ...i, icon: ICONS.includes(i.icon) ? i.icon : "gift" }));
          // Match every invented idea with a real Amazon product (affiliate link), when the store is configured.
          if (store) {
            const found = await findProducts(ideas.map((i) => i.searchQuery || i.title), budget);
            ideas.forEach((i, n) => { i.product = found[n]; i.searchUrl = taggedSearchUrl(store, i.searchQuery || i.title); });
          }
          reply.cards.push({ type: "ideas", person: a.person, ideas });
          const matched = ideas.filter((i) => i.product).map((i, n) => `${n + 1}) ${i.product!.title.slice(0, 80)} at ${i.product!.price ?? "no price"}`);
          content = [{ text: matched.length ? `Cards are on screen with real Amazon products: ${matched.join("; ")}. Mention the price of the one you recommend.` : "Cards are on screen." }];
        } else if (use.name === "suggest_gifts" && !HAS_BUDGET.test(saidByUser)) {
          // Hard rule: ideas only after the user has given a budget in this conversation.
          isError = true;
          content = [{ text: "Not allowed yet: the user has not given a budget. Ask for the budget in one short question and wait." }];
        } else if (needsYes(use.name, args) && !SAID_YES.test(message)) {
          // Hard rule, not left to the model: nothing is bought without the user's explicit yes.
          isError = true;
          content = [{ text: "Not allowed yet: the user has not said yes in this turn. If no checkout is on screen, call start_purchase; then ask \"Should I order it?\" and wait." }];
        } else {
          if (use.name === "suggest_gifts" && typeof args.maxUsd === "number") budget = args.maxUsd;
          const r = await client.callTool({ name: use.name, arguments: args });
          isError = Boolean(r.isError);
          const body = asText(r);
          content = [{ text: body }];
          if (!isError) addPurchaseCard(reply, use.name, body);
        }
        reply.tools.push({ name: use.name, args, isError });
        results.push({ toolResult: { toolUseId: use.toolUseId, content, status: isError ? "error" : "success" } });
      }
      messages.push({ role: "user", content: results });
    }

    await ensureGuessesSaved(client, toolConfig, messages, reply, people, interview, explore);

    if (!reply.text && reply.tools.length) reply.text = "Done, I saved that.";
    if (!reply.text) reply.text = reply.cards.length ? "Here you go." : "Sorry, I didn't get that. Could you say it another way?";
    reply.memory = memoryOf(reply);
    // Save the full conversation, tool calls included, so the next turn sees what was done.
    await withAccount(repo, accountId, true, (a) => { a.alexa = trim(messages); });
    return reply;
  } finally {
    await client.close();
    await server.close();
  }
}

// Nova sometimes announces inferred traits without saving them. When that happens, ask once more
// with the tool forced, on a copy of the conversation, and run the call it returns.
async function ensureGuessesSaved(client: Client, toolConfig: { tools: Tool[] }, messages: Message[], reply: AlexaReply, people: string, interview: string, explore: string) {
  if (reply.tools.some((t) => t.name === "save_guesses") || !/\b(infer|traits?|guess(es)?)\b/i.test(reply.text)) return;
  const res = await bedrock.send(new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: systemPrompt(people, interview, explore) }],
    messages: [...messages, { role: "user", content: [{ text: "[GiftyQuest note: save the traits you just mentioned with save_guesses now, each with a short reason.]" }] }],
    toolConfig: { ...toolConfig, toolChoice: { tool: { name: "save_guesses" } } },
    inferenceConfig: { maxTokens: 500, temperature: 0.2 },
  }));
  const use = (res.output?.message?.content ?? []).find((c) => c.toolUse?.name === "save_guesses")?.toolUse;
  if (!use) return;
  const args = (use.input ?? {}) as Record<string, unknown>;
  const r = await client.callTool({ name: "save_guesses", arguments: args });
  reply.tools.push({ name: "save_guesses", args, isError: Boolean(r.isError) });
}

function addPurchaseCard(reply: AlexaReply, tool: string, body: string) {
  try {
    const data = JSON.parse(body);
    if (tool === "start_purchase") {
      const c = data.checkout;
      reply.cards.push({ type: "checkout", person: c.person, title: c.title, priceUsd: c.priceUsd, icon: c.icon });
    } else if (tool === "confirm_purchase") {
      reply.cards.push({ type: "receipt", person: data.person, title: data.title, priceUsd: data.priceUsd, order: data.order });
    }
  } catch {
    /* tool returned plain text; no card */
  }
}
