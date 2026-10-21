// Live Alexa simulation: every turn goes to the server, where Amazon Nova on Bedrock drives the
// GiftyQuest MCP tools. The card on the left updates from the saved data after each reply.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Person } from "../../../shared/types";
import { judgeCode, live, type LiveReply } from "../lib/api";
import { newId } from "../lib/id";
import { useStore } from "../lib/store";
import type { Msg } from "./useScriptedAlexa";

type Status = { checked: boolean; available: boolean; needsCode: boolean; model: string };

const BLOCKS: Record<string, (args: Record<string, unknown>) => string[]> = {
  add_hint: () => ["hints"],
  add_preference: (a) => [a.kind === "dislike" ? "dislikes" : a.kind === "allergy" ? "allergies" : "likes"],
  update_profile: (a) => [...(a.date ? ["dates"] : []), ...(a.sizes ? ["sizes"] : []), ...(a.name || a.relationship || a.voiceAlias ? ["head"] : [])],
  create_person: () => ["head"],
  save_guesses: () => ["guesses"],
  confirm_purchase: () => ["gifts"],
  record_gift: () => ["gifts"],
};

const norm = (s: string) => s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().replace(/^(my|mi)\s+/, "").trim();
function resolve(people: Person[], ref: unknown): Person | undefined {
  if (typeof ref !== "string") return undefined;
  const r = norm(ref);
  return people.find((p) => p.id === ref || norm(p.name) === r || norm(p.voiceAlias) === r || norm(p.relationship) === r);
}

const fmtTool = (t: LiveReply["tools"][number]) => {
  const a = Object.entries(t.args).filter(([, v]) => typeof v !== "object").map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(", ");
  return `${t.name}(${a.length > 60 ? a.slice(0, 60) + "…" : a})${t.isError ? " ✗" : ""}`;
};

export function useLiveAlexa() {
  const store = useStore();
  const [status, setStatus] = useState<Status>({ checked: false, available: false, needsCode: false, model: "" });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [quick, setQuick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const fresh = useRef(true); // the next message starts a new conversation on the server

  const greet = useCallback(() => {
    fresh.current = true;
    setMsgs([{ id: newId(), kind: "bot", text: "Hi, I'm Alexa with GiftyQuest. Tell me something about someone you love, ask for gift ideas, or add someone new." }]);
    setQuick(["Gift ideas for Javier", "New person, by voice", "Note that Dani just got into climbing"]);
  }, []);

  const check = useCallback(async () => {
    try {
      const s = await live.status();
      setStatus({ checked: true, available: s.live, needsCode: s.needsCode, model: s.model });
    } catch {
      setStatus({ checked: true, available: false, needsCode: false, model: "" });
    }
  }, []);
  useEffect(() => { check(); greet(); }, [check, greet]);

  const send = useCallback(async (raw: string) => {
    const text = raw.trim();
    if (!text || busy) return;
    setQuick([]);
    setMsgs((m) => [...m, { id: newId(), kind: "user", text }]);
    setBusy(true);
    try {
      const reply = await live.say(store.accountId, text, fresh.current);
      fresh.current = false;
      const out: Msg[] = [{ id: newId(), kind: "bot", text: reply.text, tools: reply.tools.map(fmtTool) }];
      for (const c of reply.cards) {
        if (c.type === "ideas" && c.ideas) out.push({ id: newId(), kind: "ideas", ideas: c.ideas.map((i) => ({ icon: i.icon, title: i.title, price: i.priceUsd, why: i.why, query: i.title, basedOn: i.basedOn, product: i.product, searchUrl: i.searchUrl })) });
        if (c.type === "checkout") out.push({ id: newId(), kind: "checkout", idea: { icon: c.icon ?? "gift", title: c.title ?? "", price: c.priceUsd ?? 0, why: "", query: c.title ?? "" } });
        if (c.type === "receipt") out.push({ id: newId(), kind: "receipt", idea: { icon: "gift", title: c.title ?? "", price: c.priceUsd ?? 0, why: "", query: "" }, order: c.order ?? "" });
      }
      setMsgs((m) => [...m, ...out]);

      // show what changed: switch to the person Alexa worked on and highlight the blocks
      const people = (await store.refresh(true)) ?? store.people;
      const touched = [...reply.tools].reverse().find((t) => !t.isError && t.args.person !== undefined) ?? reply.tools.find((t) => t.name === "create_person");
      const target = touched ? resolve(people, touched.args.person ?? touched.args.name) : undefined;
      if (target) store.select(target.id);
      for (const t of reply.tools) {
        const p = resolve(people, t.args.person ?? t.args.name) ?? target;
        if (!t.isError && p) (BLOCKS[t.name]?.(t.args) ?? []).forEach((b) => store.flash(p.id, b));
      }

      const last = reply.cards[reply.cards.length - 1];
      setQuick(last?.type === "ideas" ? ["Buy the first one", "Something more fun", "Cheaper, please"]
        : last?.type === "checkout" ? ["Yes, order it", "Cancel"] : []);
    } catch (e) {
      const status = (e as { status?: number }).status;
      const text = status === 403 ? "The live assistant needs a judge code."
        : status === 429 ? "That's enough for today on this demo account. Try again tomorrow."
          : "Sorry, I couldn't reach the assistant. Try again in a moment.";
      setMsgs((m) => [...m, { id: newId(), kind: "bot", text }]);
      if (status === 403) check();
    } finally {
      setBusy(false);
    }
  }, [busy, store, check]);

  const startInterview = useCallback(() => send("I want to add someone new. Let's do the gift interview."), [send]);
  const explore = useCallback(() => send(`Help me get to know ${store.current?.name ?? "them"} better.`), [send, store]);
  const restart = useCallback(async () => { await store.reset(); greet(); }, [store, greet]);
  const unlock = useCallback(async (code: string) => { judgeCode.set(code.trim()); await check(); }, [check]);

  return { status, msgs, quick, busy, send, startInterview, explore, restart, unlock };
}
