// Scripted stand-in for Alexa+. It speaks the same tool names the MCP server will expose,
// so swapping it for the Bedrock brain later does not change the UI.
import { useCallback, useEffect, useRef, useState } from "react";
import type { Person } from "../../../shared/types";
import { MONTHS, inDays, soonest, todayIso } from "../lib/dates";
import { newId } from "../lib/id";
import { blankPerson } from "../lib/seed";
import { useStore } from "../lib/store";
import { ideasFor, type Idea, type Theme } from "./catalog";

export type Msg =
  | { id: string; kind: "user" | "bot"; text: string; tools?: string[] }
  | { id: string; kind: "ideas"; ideas: Idea[] }
  | { id: string; kind: "checkout"; idea: Idea }
  | { id: string; kind: "receipt"; idea: Idea; order: string };

type NewMsg = Msg extends infer M ? (M extends Msg ? Omit<M, "id"> : never) : never;

interface StepResult { person: Person; tools: string[]; blocks: string[]; say?: string }
interface Step { ask: (p: Person) => string; sample: string; apply: (text: string, p: Person) => StepResult }

const reduceMotion = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
const wait = (ms: number) => new Promise((r) => setTimeout(r, reduceMotion() ? 0 : ms));
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const splitList = (t: string) => t.replace(/\.$/, "").split(/\s*,\s*|\s+and\s+|\s+y\s+/i).map((s) => s.trim()).filter(Boolean).map(cap);
const obj = (p: Person) => (p.pronoun === "her" ? "her" : p.pronoun === "him" ? "him" : "them");
const subj = (p: Person) => (p.pronoun === "her" ? "she" : p.pronoun === "him" ? "he" : "they");

const RELATIONS: [RegExp, string, Person["pronoun"]][] = [
  [/girlfriend|wife|novia|esposa/i, "Partner", "her"],
  [/boyfriend|husband|novio|esposo/i, "Partner", "him"],
  [/partner|pareja/i, "Partner", "them"],
  [/mom|mother|madre|mam/i, "Mother", "her"],
  [/dad|father|padre|pap/i, "Father", "him"],
  [/sister|hermana/i, "Sister", "her"],
  [/brother|hermano/i, "Brother", "him"],
  [/boss|jefe|cowork|colleague/i, "Coworker", "them"],
];

const STEPS: Step[] = [
  {
    ask: () => "Let's build a gift profile. Who are we shopping for?",
    sample: "My mom, Carmen",
    apply(t, p) {
      const words = t.replace(/[.,]/g, " ").split(/\s+/).filter((w) => /^[A-ZÁÉÍÓÚÑ]/.test(w) && !/^(My|Mi|The|La|El)$/.test(w));
      const rel = RELATIONS.find(([re]) => re.test(t));
      const alias = t.match(/\b(my|mi)\s+\w+/i);
      const person = { ...p, name: words.pop() ?? t.trim(), relationship: rel?.[1] ?? "Friend", pronoun: rel?.[2] ?? "them", voiceAlias: "" };
      person.voiceAlias = alias ? alias[0].toLowerCase() : person.name;
      return { person, tools: [`create_person(name="${person.name}", relationship="${person.relationship}")`], blocks: ["head"], say: `Nice. ${person.name} it is.` };
    },
  },
  {
    ask: (p) => `When is ${p.name}'s birthday? The year is optional.`,
    sample: "May 3rd, 1961",
    apply(t, p) {
      const month = MONTHS.findIndex((m) => new RegExp(m.slice(0, 3), "i").test(t));
      const day = parseInt(t.match(/\b(\d{1,2})(st|nd|rd|th)?\b/)?.[1] ?? "", 10);
      const year = parseInt(t.match(/\b(19|20)\d{2}\b/)?.[0] ?? "", 10) || null;
      const ok = month >= 0 && day > 0;
      const person = ok ? { ...p, dates: [...p.dates, { id: newId(), type: "Birthday", month, day, year }] } : p;
      return {
        person, blocks: ["dates"],
        tools: [`update_profile(birthday="${ok ? `${MONTHS[month]} ${day}` : t}")`],
        say: ok ? `Got it, ${MONTHS[month]} ${day}.` : "I'll leave the date for later.",
      };
    },
  },
  {
    ask: (p) => `Name one to three artists ${p.name} loves.`,
    sample: "Julio Iglesias and Mecano",
    apply: (t, p) => ({ person: { ...p, likes: { ...p.likes, music: [...p.likes.music, ...splitList(t)] } }, blocks: ["likes"], tools: [`add_preference(music=${JSON.stringify(splitList(t))})`] }),
  },
  {
    ask: (p) => `And ${obj(p) === "them" ? "their" : obj(p) === "her" ? "her" : "his"} favorite foods?`,
    sample: "Paella and dark chocolate",
    apply: (t, p) => ({ person: { ...p, likes: { ...p.likes, food: [...p.likes.food, ...splitList(t)] } }, blocks: ["likes"], tools: [`add_preference(food=${JSON.stringify(splitList(t))})`] }),
  },
  {
    ask: (p) => `What's a hobby ${subj(p)} could spend a whole weekend on?`,
    sample: "Gardening",
    apply: (t, p) => ({ person: { ...p, likes: { ...p.likes, hobbies: [...p.likes.hobbies, ...splitList(t)] } }, blocks: ["likes"], tools: [`add_preference(hobby=${JSON.stringify(splitList(t))})`] }),
  },
  {
    // Follow-up built from the previous answer: this is what makes the interview feel like a conversation.
    ask: (p) => `Does ${p.name} already have good ${(p.likes.hobbies[0] ?? "hobby").toLowerCase()} gear, or is something missing or bothering ${obj(p)}?`,
    sample: "She has everything, but her knees hurt when she kneels",
    apply: (t, p) => ({
      person: { ...p, hints: [{ id: newId(), text: t.replace(/\.$/, ""), date: todayIso(), via: "voice" }, ...p.hints] },
      blocks: ["hints"], tools: [`add_hint(text="${t.slice(0, 28)}…")`], say: "Good to know, I wrote that down as a hint.",
    }),
  },
  {
    ask: () => "Last one. Anything they really don't like?",
    sample: "Clutter. She hates knick-knacks",
    apply: (t, p) => ({
      person: { ...p, dislikes: [...p.dislikes, ...t.replace(/\./g, ",").split(",").map((s) => s.trim().replace(/^(she|he|they)\s+(hates?|doesn'?t like|don'?t like|can'?t stand)\s+/i, "")).filter(Boolean).slice(0, 2).map(cap)] },
      blocks: ["dislikes"], tools: ["add_preference(dislike=true)"],
    }),
  },
];

// "Explore": a few questions that deepen an existing card. Every answer becomes a dated hint.
const hintStep = (ask: (p: Person) => string, sample: string): Step => ({
  ask, sample,
  apply: (t, p) => ({
    person: { ...p, hints: [{ id: newId(), text: cap(t.replace(/\.$/, "")), date: todayIso(), via: "voice" }, ...p.hints] },
    blocks: ["hints"], tools: [`add_hint(person="${p.name}")`],
  }),
});
const EXPLORE: Step[] = [
  hintStep((p) => `Let's get to know ${p.name} better. What has ${subj(p)} been talking about wanting lately?`, "She keeps saying she wants to sleep better"),
  hintStep((p) => `Does ${p.name} prefer experiences or things?`, "Experiences, definitely"),
  hintStep((p) => `Any trip, plan or change coming up for ${p.name}?`, "We're going to Lisbon in December"),
];

function exploreTraits(p: Person): Person["guesses"] {
  const text = p.hints.slice(0, 3).map((h) => h.text.toLowerCase()).join(" ");
  const out: Person["guesses"] = [];
  if (/sleep|rest|tired|calm/.test(text)) out.push({ id: newId(), text: "Would love something calming for the evenings", why: "wants to sleep better", kept: false });
  if (/experience/.test(text)) out.push({ id: newId(), text: "Values shared moments over objects", why: "prefers experiences", kept: false });
  if (/trip|travel|going to|lisbon|holiday/.test(text)) out.push({ id: newId(), text: "Travel-friendly gifts will get used", why: "a trip is coming up", kept: false });
  return out;
}

function inferTraits(p: Person): Person["guesses"] {
  const out: Person["guesses"] = [];
  if (p.dislikes.some((d) => /clutter|knick|trinket/i.test(d))) {
    out.push({ id: newId(), text: "Prefers useful or consumable gifts over decorative ones", why: "hates clutter and knick-knacks", kept: false });
  }
  const sore = p.hints.find((h) => /knee|back|hurt|pain/i.test(h.text));
  if (sore) out.push({ id: newId(), text: `Comfort upgrades for ${(p.likes.hobbies[0] ?? "a hobby").toLowerCase()} would land well`, why: sore.text.toLowerCase(), kept: false });
  if (p.likes.music.length) out.push({ id: newId(), text: "Music and live shows are a safe bet", why: `loves ${p.likes.music.join(" and ")}`, kept: false });
  return out;
}

export function useScriptedAlexa() {
  const store = useStore();
  const peopleRef = useRef(store.people);
  peopleRef.current = store.people;
  const currentIdRef = useRef(store.currentId);
  currentIdRef.current = store.currentId;

  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [quick, setQuick] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const conv = useRef({ mode: "free" as "free" | "interview" | "explore", steps: STEPS, step: 0, pending: null as Idea | null, awaitTheme: null as Theme | null, lastIdeas: null as Idea[] | null });

  const push = (m: NewMsg) => setMsgs((list) => [...list, { ...m, id: newId() } as Msg]);
  const person = () => peopleRef.current.find((p) => p.id === currentIdRef.current)!;
  const commit = (next: Person, blocks: string[]) => {
    peopleRef.current = peopleRef.current.map((p) => (p.id === next.id ? next : p));
    store.update(next.id, () => next);
    blocks.forEach((b) => store.flash(next.id, b));
  };
  const say = async (text: string, tools: string[] = [], ms = 650) => {
    setBusy(true);
    await wait(ms);
    setBusy(false);
    push({ kind: "bot", text, tools });
  };

  const showIdeas = async (theme: Theme, max: number | null) => {
    const p = person();
    const ideas = ideasFor(p, theme, max);
    conv.current.lastIdeas = ideas;
    const args = [`person="${p.id}"`, max ? `max_usd=${max}` : "", theme !== "base" ? `theme="${theme}"` : ""].filter(Boolean).join(", ");
    await say(`Here are ${ideas.length} ideas for ${p.name}. Each one says why I picked it.`, [`get_profile("${p.id}")`, `suggest_gifts(${args})`]);
    push({ kind: "ideas", ideas });
    setQuick(p.id === "maria" ? ["Something for the beach", "Buy the first one", "New person, by voice"] : ["Something less practical, more of a treat", "Buy the first one"]);
  };

  const startInterview = useCallback(async () => {
    const id = store.addPerson();
    const fresh = blankPerson(id);
    peopleRef.current = [...peopleRef.current, fresh];
    currentIdRef.current = id;
    conv.current = { mode: "interview", steps: STEPS, step: 0, pending: null, awaitTheme: null, lastIdeas: null };
    setMsgs([]);
    push({ kind: "user", text: "Alexa, help me set up gift ideas for someone new." });
    await say(STEPS[0].ask(fresh), ["prompt: gift_interview"]);
    setQuick([`Answer for me: “${STEPS[0].sample}”`, "Skip"]);
  }, [store]);

  const explore = async () => {
    conv.current = { mode: "explore", steps: EXPLORE, step: 0, pending: null, awaitTheme: null, lastIdeas: null };
    await say(EXPLORE[0].ask(person()), [`profile_gaps(person="${person().name}")`, "prompt: explore_person"]);
    setQuick([`Answer for me: “${EXPLORE[0].sample}”`, "Skip"]);
  };

  const answerStep = async (text: string) => {
    const c = conv.current;
    if (!/^skip$/i.test(text)) {
      const r = c.steps[c.step].apply(text, person());
      commit(r.person, r.blocks);
      await say(r.say ?? "Noted.", r.tools, 400);
    }
    c.step += 1;
    if (c.step < c.steps.length) {
      await say(c.steps[c.step].ask(person()));
      setQuick([`Answer for me: “${c.steps[c.step].sample}”`, "Skip"]);
      return;
    }
    const explored = c.mode === "explore";
    c.mode = "free";
    const p = person();
    if (explored) {
      const found = exploreTraits(p);
      commit({ ...p, guesses: [...p.guesses, ...found] }, ["guesses"]);
      await say(`Thanks, that helps a lot. I saved your answers as hints${found.length ? ` and added ${found.length} new guesses in purple` : ""}. Want gift ideas with this in mind?`, [`save_guesses(person="${p.name}")`], 800);
      setQuick(["Yes, show me ideas"]);
      return;
    }
    const guesses = inferTraits(p);
    commit({ ...p, guesses: [...p.guesses, ...guesses] }, ["guesses"]);
    const next = p.dates.length ? soonest(p) : null;
    await say(
      `Thanks. ${p.name}'s card is ready, and I added ${guesses.length} guesses in purple. Keep the ones that sound right.${next ? ` The ${next.type.toLowerCase()} is ${inDays(next.days)}.` : ""} Want some ideas?`,
      [`infer_traits("${p.id}")`], 900,
    );
    setQuick(["Yes, show me ideas"]);
  };

  const send = useCallback(async (raw: string) => {
    const text = raw.replace(/^Answer for me: “|”$/g, "").trim();
    if (!text) return;
    setQuick([]);
    push({ kind: "user", text });
    const c = conv.current;
    const t = text.toLowerCase();

    if (c.mode === "interview" || c.mode === "explore") return answerStep(text);
    if (/know .* better|explore/i.test(t)) return explore();
    if (/new person|someone new|alguien nuevo/.test(t)) return startInterview();

    if (c.pending) {
      if (/^(yes|yeah|sure|order|confirm|s[ií]|vale)/.test(t)) {
        const p = person(), idea = c.pending;
        c.pending = null;
        const next = p.dates.length ? soonest(p) : null;
        await say(`Done. I added it to ${p.name}'s gift history${next ? ` for the ${next.type.toLowerCase()}` : ""}. After you give it, I'll ask how it went.`, ["confirm_purchase()", 'record_gift(status="bought")']);
        push({ kind: "receipt", idea, order: `SIM-${Math.floor(100000 + Math.random() * 899999)}` });
        commit({ ...p, gifts: [{ id: newId(), icon: idea.icon, title: idea.title, occasion: next ? `${next.type} ${next.date.getFullYear()}` : "No occasion", status: "bought", reaction: null, priceUsd: idea.price }, ...p.gifts] }, ["gifts"]);
        return setQuick(["New person, by voice"]);
      }
      if (/cancel|^no\b/.test(t)) { c.pending = null; return say("No problem, I didn't order anything.", ["cancel_purchase()"]); }
    }

    if (/\b(buy|order|get|compra)/.test(t) && c.lastIdeas) {
      const pick = c.lastIdeas.find((i) => t.includes(i.title.toLowerCase().slice(0, 18))) ?? c.lastIdeas[0];
      c.pending = pick;
      await say(`${pick.title} for $${pick.price}. Should I order it?`, [`start_purchase(item="${pick.title.slice(0, 22)}…")`]);
      push({ kind: "checkout", idea: pick });
      return setQuick(["Yes, order it", "Cancel"]);
    }

    const budget = parseInt(t.match(/\$?\s?(\d{2,4})/)?.[1] ?? "", 10) || null;
    const noLimit = /no limit|any budget|sin l[ií]mite|whatever/.test(t);
    if (c.awaitTheme && (budget || noLimit)) { const th = c.awaitTheme; c.awaitTheme = null; return showIdeas(th, budget); }

    let theme: Theme | null = null;
    if (/beach|summer|verano|playa/.test(t)) theme = "summer";
    else if (/treat|less practical|caprich|fun|experience/.test(t)) theme = "treat";
    else if (/idea|suggest|gift|regalo|under|yes|s[ií]\b|budget/.test(t) || budget) theme = "base";
    if (theme) {
      if (budget || noLimit || c.lastIdeas) return showIdeas(theme, budget);
      c.awaitTheme = theme;
      await say("Sure. What's your budget this time?");
      return setQuick(["Under $50", "Under $80", "No limit"]);
    }

    if (/note|apunta|remember|loved|le encant/.test(t)) {
      const p = person();
      const hint = text.replace(/^(alexa,?\s*)?(note|remember)( that)?\s*/i, "");
      commit({ ...p, hints: [{ id: newId(), text: cap(hint), date: todayIso(), via: "voice" }, ...p.hints] }, ["hints"]);
      return say(`Saved to ${p.name}'s hints.`, [`add_hint(person="${p.id}")`]);
    }

    return say("I can suggest gifts (“show me ideas”), refine them (“something for the beach”), take a hint (“note that she loved…”) or interview someone new.");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startInterview]);

  const restart = useCallback(async () => {
    await store.reset();
    conv.current = { mode: "free", steps: STEPS, step: 0, pending: null, awaitTheme: null, lastIdeas: null };
    setMsgs([
      { id: newId(), kind: "user", text: "Alexa, note that María loved the ceramic lamp at her sister's place." },
      { id: newId(), kind: "bot", text: "Saved to María's hints.", tools: ['add_hint(person="maria")'] },
      { id: newId(), kind: "bot", text: "Heads up: your anniversary with María is coming soon. Want a few ideas?", tools: ["get_upcoming_dates(days=30)"] },
    ]);
    setQuick(["Yes, show me ideas", "New person, by voice"]);
  }, [store]);

  // first load
  const started = useRef(false);
  useEffect(() => {
    if (started.current) return;
    started.current = true;
    const maria = store.people.find((p) => p.id === "maria");
    const next = maria && soonest(maria);
    setMsgs([
      { id: newId(), kind: "user", text: "Alexa, note that María loved the ceramic lamp at her sister's place." },
      { id: newId(), kind: "bot", text: "Saved to María's hints.", tools: ['add_hint(person="maria")'] },
      { id: newId(), kind: "bot", text: `Heads up: your ${next ? next.type.toLowerCase() : "anniversary"} with María is ${next ? inDays(next.days) : "coming soon"}. Want a few ideas?`, tools: ["get_upcoming_dates(days=30)"] },
    ]);
    setQuick(["Yes, show me ideas", "New person, by voice"]);
  }, [store.people]);

  return { msgs, quick, busy, send, restart, startInterview, explore };
}
