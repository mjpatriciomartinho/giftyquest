// The GiftyQuest MCP server: the door Alexa+ (or any MCP client) uses to read and update cards.
// One stateless server per request, scoped to one account.
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import * as gifts from "./core/gifts";
import type { AccountRepo, Account } from "./store/repo";
import { withAccount } from "./store/lock";

const person = z.string().describe('Who the gift is for: their name, or how the user calls them ("my girlfriend", "mom").');
const ok = (data: unknown) => ({ content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] });
const fail = (e: unknown) => ({ isError: true, content: [{ type: "text" as const, text: e instanceof Error ? e.message : String(e) }] });

export function buildMcpServer(repo: AccountRepo, accountId: string) {
  const server = new McpServer({ name: "giftyquest", version: "0.1.0" });

  // Wraps a tool body: loads the account, runs it, saves if it changed anything.
  const run = (write: boolean, fn: (a: Account) => unknown) => async () => {
    try {
      return ok(await withAccount(repo, accountId, write, fn));
    } catch (e) {
      return fail(e);
    }
  };

  server.registerTool("list_people", {
    title: "List people",
    description: "List everyone the user buys gifts for, with their next important date.",
    annotations: { readOnlyHint: true },
  }, run(false, (a) => gifts.listPeople(a)));

  server.registerTool("get_profile", {
    title: "Get a person's gift profile",
    description: "Full card for one person: dates, sizes, likes, dislikes, allergies, hints, Alexa's guesses and gift history with reactions.",
    inputSchema: { person },
    annotations: { readOnlyHint: true },
  }, ({ person: ref }) => run(false, (a) => gifts.findPerson(a, ref))());

  server.registerTool("create_person", {
    title: "Create a person",
    description: "Add someone new to buy gifts for. Use at the start of the gift interview.",
    inputSchema: {
      name: z.string(),
      relationship: z.string().optional().describe("Partner, Mother, Friend, Coworker..."),
      voiceAlias: z.string().optional().describe('How the user refers to them, e.g. "my mom".'),
      pronoun: z.enum(["her", "him", "them"]).optional(),
    },
  }, (input) => run(true, (a) => gifts.summary(gifts.createPerson(a, input)))());

  server.registerTool("update_profile", {
    title: "Update profile",
    description: "Change basic details, sizes, or add/replace an important date (birthday, anniversary).",
    inputSchema: {
      person,
      name: z.string().optional(),
      relationship: z.string().optional(),
      voiceAlias: z.string().optional(),
      pronoun: z.enum(["her", "him", "them"]).optional(),
      sizes: z.object({ top: z.string(), pants: z.string(), shoes: z.string(), ring: z.string() }).partial().optional()
        .describe('Free text with the size system, e.g. "M (US)" or "38 (EU)".'),
      date: z.object({
        type: z.string().describe("Birthday, Anniversary, ..."),
        month: z.number().int().min(1).max(12).describe("1 = January"),
        day: z.number().int().min(1).max(31),
        year: z.number().int().optional().describe("Optional, only if the user knows it"),
      }).optional(),
    },
  }, ({ person: ref, date, ...rest }) => run(true, (a) => gifts.summary(gifts.updateProfile(a, ref, {
    ...rest, date: date ? { ...date, month: date.month - 1 } : undefined,
  })))());

  server.registerTool("add_preference", {
    title: "Add likes, dislikes or allergies",
    description: "Save things the person likes (music, food, hobbies, colors, brands), dislikes, or allergies.",
    inputSchema: {
      person,
      kind: z.enum(["music", "food", "hobbies", "colors", "brands", "dislike", "allergy"]),
      values: z.array(z.string()).min(1),
    },
  }, ({ person: ref, kind, values }) => run(true, (a) => {
    const p = gifts.addPreference(a, ref, kind, values);
    return { person: p.name, likes: p.likes, dislikes: p.dislikes, allergies: p.allergies };
  })());

  server.registerTool("add_hint", {
    title: "Save a hint",
    description: 'Save something the person said or showed interest in, e.g. "loved the ceramic lamp at her sister\'s place". Stored with today\'s date.',
    inputSchema: { person, text: z.string() },
  }, ({ person: ref, text }) => run(true, (a) => ({ person: gifts.addHint(a, ref, text).name, saved: text }))());

  server.registerTool("save_guesses", {
    title: "Save Alexa's guesses",
    description: "Store traits you inferred about the person, each with the reason. The user later keeps or drops them. Never present a guess as a fact.",
    inputSchema: { person, guesses: z.array(z.object({ text: z.string(), why: z.string() })).min(1) },
  }, ({ person: ref, guesses }) => run(true, (a) => ({ person: gifts.saveGuesses(a, ref, guesses).name, saved: guesses.length }))());

  server.registerTool("profile_gaps", {
    title: "Profile gaps",
    description: "What is missing or thin on a person's card, plus good angles to learn more. Use it to explore a person.",
    inputSchema: { person },
    annotations: { readOnlyHint: true },
  }, ({ person: ref }) => run(false, (a) => gifts.profileGaps(a, ref))());

  server.registerTool("get_upcoming_dates", {
    title: "Upcoming dates",
    description: "Birthdays, anniversaries and other dates coming up for everyone.",
    inputSchema: { withinDays: z.number().int().min(1).max(366).default(30) },
    annotations: { readOnlyHint: true },
  }, ({ withinDays }) => run(false, (a) => gifts.upcomingDates(a, withinDays))());

  server.registerTool("get_briefing", {
    title: "Briefing",
    description: "What deserves the user's attention now: upcoming dates (most urgent first), whether a gift is already bought for each, the newest hints to build on and past gifts that did not land. Call it when the user opens the assistant, before they ask for anything.",
    inputSchema: { withinDays: z.number().int().min(1).max(366).default(45) },
    annotations: { readOnlyHint: true },
  }, ({ withinDays }) => run(false, (a) => gifts.getBriefing(a, withinDays))());

  server.registerTool("suggest_gifts", {
    title: "Suggest gifts",
    description: "Everything needed to invent gifts for one person within a budget: newest hints, likes, dislikes, allergies, kept guesses and gifts already given. Ask the user for the budget before calling it. Combine at least two of these signals in each idea and explain the reason.",
    inputSchema: {
      person,
      maxUsd: z.number().positive().optional().describe("Budget in USD; omit for no limit"),
      theme: z.enum(["base", "summer", "treat"]).default("base").describe('"summer" for beach or summer ideas, "treat" for experiences and indulgent picks'),
    },
    annotations: { readOnlyHint: true },
  }, ({ person: ref, maxUsd, theme }) => run(false, (a) => gifts.suggestGifts(a, ref, maxUsd ?? null, theme))());

  server.registerTool("start_purchase", {
    title: "Start a purchase",
    description: "Prepare a checkout for a gift and show it to the user. Never complete it without an explicit yes. Checkout is simulated.",
    inputSchema: { person, title: z.string(), priceUsd: z.number().positive(), icon: z.string().optional() },
  }, ({ person: ref, ...item }) => run(true, (a) => gifts.startPurchase(a, ref, item))());

  server.registerTool("confirm_purchase", {
    title: "Confirm the purchase",
    description: "Complete the pending checkout after the user clearly says yes. Adds the gift to the person's history as bought.",
  }, run(true, (a) => gifts.confirmPurchase(a)));

  server.registerTool("cancel_purchase", {
    title: "Cancel the purchase",
    description: "Drop the pending checkout.",
  }, run(true, (a) => gifts.cancelPurchase(a)));

  server.registerTool("record_gift", {
    title: "Record a gift or its reaction",
    description: "Save a gift idea, update its status, or record how the person reacted after receiving it. This is how GiftyQuest learns.",
    inputSchema: {
      person,
      title: z.string(),
      occasion: z.string().optional(),
      status: z.enum(["idea", "bought", "wrapped", "given"]).optional(),
      reaction: z.enum(["loved", "liked", "meh", "disliked"]).optional(),
    },
  }, ({ person: ref, ...gift }) => run(true, (a) => {
    const p = gifts.recordGift(a, ref, gift);
    return { person: p.name, gifts: p.gifts.slice(0, 5) };
  })());

  server.registerPrompt("explore_person", {
    title: "Explore a person",
    description: "A short conversation that fills the gaps on someone's card and finds new gift angles.",
    argsSchema: { name: z.string().optional().describe("Who to explore") },
  }, ({ name }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          `Help the user get to know ${name ?? "this person"} better for gift giving. You are speaking out loud: one short question at a time.`,
          "1. Call profile_gaps first.",
          "2. Ask three or four questions in total. Mix one or two missing basics (for example favorite colors, a size, a birthday) with one or two deeper angles from the list. Start with the most useful for gifts.",
          "3. Follow up once when an answer opens something interesting.",
          "4. Save each answer as soon as you get it: add_preference, update_profile or add_hint.",
          '5. The user may say "skip" or "I don\'t know": move on.',
          "6. At the end, call save_guesses with one or two new traits and their reasons. Then ask if they want gift ideas, and ask for a budget before suggesting anything.",
        ].join("\n"),
      },
    }],
  }));

  server.registerPrompt("daily_briefing", {
    title: "Proactive briefing",
    description: "Open the conversation before the user asks: the date that matters most, what is still missing and what to build on.",
  }, () => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          "The user just opened the assistant and has not asked anything yet. Speak first, out loud, in two or three short sentences, 45 words at most.",
          "1. Call get_briefing.",
          "2. Pick only the most urgent item. Say the occasion, the person and how many days are left, and whether a gift is already bought. Use the person's pronoun from the briefing.",
          "3. If no gift is bought yet, mention only the single most useful recent hint, and one past gift to avoid if there is one (it was not liked, so say that). Then ask for a budget for ideas, in one short question. Do not call suggest_gifts yet.",
          "4. If the gift is already bought, say so in one sentence and offer to note a hint or plan the next date.",
          "5. If nothing is coming up, greet briefly and say what you can do: take a hint, suggest gifts or add someone new.",
        ].join("\n"),
      },
    }],
  }));

  server.registerPrompt("gift_interview", {
    title: "Gift interview",
    description: "A short voice interview that builds a gift profile for someone new.",
    argsSchema: { name: z.string().optional().describe("The person's name, if already known") },
  }, ({ name }) => ({
    messages: [{
      role: "user",
      content: {
        type: "text",
        text: [
          `Run a short, warm gift interview${name ? ` about ${name}` : ""}. You are speaking out loud, so ask ONE short question at a time and wait for the answer. Save each answer as soon as you get it, then ask the next question.`,
          "1. Who are we shopping for (name and relationship)? Then call create_person.",
          "2. When is their birthday? The year is optional. Save it with update_profile.",
          "3. One to three artists they love. 4. Favorite foods. 5. A hobby they could spend a whole weekend on. Save each with add_preference.",
          "6. Ask ONE follow-up based on the hobby: do they already have the gear, or is something missing or bothering them? Save the answer with add_hint.",
          "7. Anything they really don't like? Save with add_preference kind=dislike.",
          'The user may say "skip" or "I don\'t know": move on without pushing.',
          "At the end, infer two or three traits and save them with save_guesses, each with a short reason. Tell the user they can keep or drop them on the web.",
          "Then offer gift ideas. Ask for the budget before calling suggest_gifts. Explain why each idea fits in one sentence.",
        ].join("\n"),
      },
    }],
  }));

  return server;
}
