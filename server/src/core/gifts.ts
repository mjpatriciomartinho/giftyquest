// Business logic for GiftyQuest. Pure functions over an Account: no HTTP, no MCP, no AWS.
// Both the REST API and the MCP server call these.
import { randomBytes } from "node:crypto";
import type { GiftStatus, Likes, Person, Reaction, SizeKey } from "../../../shared/types";
import { blankPerson } from "../../../shared/seed";
import { MONTHS, nextOccurrence, todayIso } from "../../../shared/dates";
import { briefing } from "../../../shared/briefing";
import type { Theme } from "../../../shared/catalog";
import type { Account } from "../store/repo";

export class NotFound extends Error {}

const id = () => randomBytes(5).toString("hex");
const norm = (s: string) => s.normalize("NFD").replace(/\p{Mn}/gu, "").toLowerCase().trim();

/** Find a person by id, name or the alias the user says out loud ("my girlfriend"). */
export function findPerson(account: Account, ref: string): Person {
  const r = norm(ref).replace(/^(my|mi)\s+/, "");
  const p = account.people.find((x) =>
    x.id === ref || norm(x.name) === r || norm(x.voiceAlias).replace(/^(my|mi)\s+/, "") === r || norm(x.relationship) === r,
  );
  if (!p) throw new NotFound(`No person matches "${ref}". Known people: ${account.people.map((x) => x.name).join(", ") || "none"}.`);
  return p;
}

function replace(account: Account, person: Person) {
  account.people = account.people.map((p) => (p.id === person.id ? person : p));
  return person;
}

export function summary(p: Person) {
  return {
    id: p.id, name: p.name, relationship: p.relationship, voiceAlias: p.voiceAlias,
    nextDate: p.dates.length
      ? p.dates.map((d) => ({ type: d.type, ...nextOccurrence(d) })).sort((a, b) => a.days - b.days).map((d) => ({ type: d.type, inDays: d.days }))[0]
      : null,
  };
}

export function listPeople(account: Account) {
  return account.people.map(summary);
}

const HER = /\b(mother|mom|mum|wife|girlfriend|sister|daughter|aunt|grandma|grandmother|niece)\b/i;
const HIM = /\b(father|dad|husband|boyfriend|brother|son|uncle|grandpa|grandfather|nephew)\b/i;
const pronounFor = (relationship: string): Person["pronoun"] => (HER.test(relationship) ? "her" : HIM.test(relationship) ? "him" : "them");
const cap = (v: string) => v.charAt(0).toUpperCase() + v.slice(1);
const words = (s: string) => new Set(norm(s).split(/[^a-z0-9]+/).filter((w) => w.length > 3));
function similar(a: string, b: string) {
  const A = words(a), B = words(b);
  const shared = [...A].filter((w) => B.has(w)).length;
  return shared / Math.max(1, Math.min(A.size, B.size)) >= 0.6;
}

export function createPerson(account: Account, input: { name: string; relationship?: string; voiceAlias?: string; pronoun?: Person["pronoun"] }) {
  const existing = account.people.find((p) => norm(p.name) === norm(input.name));
  if (existing) return existing;
  const relationship = input.relationship ? cap(input.relationship) : "";
  const p: Person = {
    ...blankPerson(id()), name: input.name, relationship, voiceAlias: input.voiceAlias ?? input.name,
    pronoun: input.pronoun ?? pronounFor(`${relationship} ${input.voiceAlias ?? ""}`),
  };
  account.people.push(p);
  return p;
}

export function updateProfile(account: Account, ref: string, patch: {
  name?: string; relationship?: string; voiceAlias?: string; pronoun?: Person["pronoun"];
  sizes?: Partial<Record<SizeKey, string>>;
  date?: { type: string; month: number; day: number; year?: number | null };
}) {
  const p = structuredClone(findPerson(account, ref));
  if (patch.name) p.name = patch.name;
  if (patch.relationship) p.relationship = patch.relationship;
  if (patch.voiceAlias) p.voiceAlias = patch.voiceAlias;
  if (patch.pronoun) p.pronoun = patch.pronoun;
  if (patch.sizes) p.sizes = { ...p.sizes, ...patch.sizes };
  if (patch.date) {
    const d = patch.date;
    const same = p.dates.find((x) => norm(x.type) === norm(d.type));
    const entry = { id: same?.id ?? id(), type: d.type, month: d.month, day: d.day, year: d.year ?? null };
    p.dates = same ? p.dates.map((x) => (x.id === same.id ? entry : x)) : [...p.dates, entry];
  }
  return replace(account, p);
}

export type PreferenceKind = keyof Likes | "dislike" | "allergy";

export function addPreference(account: Account, ref: string, kind: PreferenceKind, values: string[]) {
  const p = structuredClone(findPerson(account, ref));
  const merge = (list: string[]) => {
    const out = [...list];
    for (const v of values.map((x) => cap(x.trim())).filter(Boolean)) if (!out.some((x) => norm(x) === norm(v))) out.push(v);
    return out;
  };
  if (kind === "dislike") p.dislikes = merge(p.dislikes);
  else if (kind === "allergy") p.allergies = merge(p.allergies);
  else p.likes[kind] = merge(p.likes[kind]);
  return replace(account, p);
}

export function addHint(account: Account, ref: string, text: string, via: "voice" | "web" = "voice") {
  const p = structuredClone(findPerson(account, ref));
  if (p.hints.some((h) => norm(h.text) === norm(text))) return p; // already saved
  p.hints.unshift({ id: id(), text: text.trim(), date: todayIso(), via });
  return replace(account, p);
}

export function saveGuesses(account: Account, ref: string, guesses: { text: string; why: string }[]) {
  const p = structuredClone(findPerson(account, ref));
  // Skip guesses that repeat an existing one in other words.
  for (const g of guesses) if (!p.guesses.some((x) => similar(x.text, g.text))) p.guesses.push({ id: id(), text: cap(g.text), why: g.why, kept: false });
  return replace(account, p);
}

export function upcomingDates(account: Account, withinDays: number) {
  return account.people
    .flatMap((p) => p.dates.map((d) => ({ person: p.name, personId: p.id, type: d.type, date: `${MONTHS[d.month]} ${d.day}`, inDays: nextOccurrence(d).days })))
    .filter((x) => x.inDays <= withinDays)
    .sort((a, b) => a.inDays - b.inDays);
}

export function getBriefing(account: Account, withinDays: number) {
  const items = briefing(account.people, withinDays);
  return {
    today: todayIso(),
    items,
    nothingSoon: items.length === 0,
  };
}

const pick = <T,>(list: T[]) => list[Math.floor(Math.random() * list.length)];

/**
 * Picks three different combinations of profile signals, one per gift idea, so ideas mix concepts
 * and do not all revolve around the same hint. The assistant invents one gift for each combination.
 */
export function ideaSeeds(p: Person): string[][] {
  const used = new Set<string>();
  const take = (pool: string[]) => {
    const free = pool.filter((x) => !used.has(x));
    if (!free.length) return null;
    const v = pick(free);
    used.add(v);
    return v;
  };
  const hints = p.hints.map((h) => `hint: ${h.text}`);
  const hobbies = p.likes.hobbies.map((x) => `hobby: ${x}`);
  const tastes = [...p.likes.food.map((x) => `food: ${x}`), ...p.likes.music.map((x) => `music: ${x}`)];
  const style = [...p.likes.colors.map((x) => `color: ${x}`), ...p.likes.brands.map((x) => `brand: ${x}`), ...p.guesses.filter((g) => g.kept && !/\b(must|never|avoid|allerg|free)\b/i.test(g.text)).map((g) => `trait: ${g.text}`)];
  const loved = p.gifts.filter((g) => g.reaction === "loved").map((g) => `loved gift: ${g.title}`);

  const seeds: string[][] = [];
  const add = (...parts: (string | null)[]) => {
    const seed = parts.filter((x): x is string => Boolean(x));
    if (seed.length >= 2) seeds.push(seed);
  };
  if (hints[0]) used.add(hints[0]);
  add(hints[0] ?? null, take(style) ?? take(hobbies));
  add(take(hobbies), take(tastes) ?? take(style));
  add(take([...hints.slice(1), ...loved]) ?? take(tastes), take(style) ?? take(hobbies), take(hobbies) ?? null);
  // fallback for thin profiles: pair whatever is left
  const rest = [...hobbies, ...tastes, ...style, ...hints].filter((x) => !used.has(x));
  while (seeds.length < 3 && rest.length >= 2) seeds.push(rest.splice(0, 2));
  return seeds.slice(0, 3);
}

/** What is missing or thin on a card, plus angles to learn more. Drives the "explore" conversation. */
export function profileGaps(account: Account, ref: string) {
  const p = findPerson(account, ref);
  const missing: string[] = [];
  if (!p.dates.some((d) => /birth/i.test(d.type))) missing.push("birthday");
  for (const k of ["top", "pants", "shoes", "ring"] as const) if (!p.sizes[k]) missing.push(`size: ${k}`);
  for (const [k, v] of Object.entries(p.likes)) if (!v.length) missing.push(`likes: ${k}`);
  if (!p.dislikes.length) missing.push("dislikes");
  if (!p.allergies.length) missing.push("allergies (or none)");
  const recent = p.hints.filter((h) => Date.now() - new Date(h.date).getTime() < 60 * 86_400_000);
  if (!recent.length) missing.push("recent hints (nothing new in the last 60 days)");
  const loved = p.gifts.find((g) => g.reaction === "loved");
  const angles = [
    `What has ${p.name} been talking about wanting or needing lately?`,
    `Does ${p.name} prefer experiences or things?`,
    `Any trip, plan or change coming up for ${p.name}?`,
    `Something ${p.name} collects, or a small daily ritual they enjoy?`,
    ...(p.likes.hobbies[0] ? [`What would make ${p.likes.hobbies[0].toLowerCase()} even better for ${p.name}?`] : []),
    ...(loved ? [`What made "${loved.title}" such a hit?`] : []),
  ];
  return { person: p.name, missing, angles };
}

/** What the assistant needs to invent gifts: the profile essentials plus one signal mix per idea. */
export function suggestGifts(account: Account, ref: string, maxUsd: number | null, theme: Theme) {
  const p = findPerson(account, ref);
  return {
    person: p.name,
    budgetUsd: maxUsd,
    theme,
    ideaSeeds: ideaSeeds(p),
    howToUse: "Invent one specific gift per idea seed that a thoughtful person would really buy, combining at least two of its signals (drop a signal that does not fit naturally). No gimmicks such as food-themed objects. Stay within budget, avoid dislikes, allergies and alreadyGiven. A hint is evidence of taste, not a shopping list: never the same kind of object as the hint. A brand means a product that brand really makes, never another object with its logo or tag.",
    dislikes: p.dislikes,
    allergies: p.allergies,
    alreadyGiven: p.gifts.map((g) => `${g.title} (${g.reaction ?? g.status})`),
  };
}

export function startPurchase(account: Account, ref: string, item: { title: string; priceUsd: number; icon?: string }) {
  const p = findPerson(account, ref);
  account.pending = { personId: p.id, title: item.title, icon: item.icon ?? "gift", priceUsd: item.priceUsd, createdAt: new Date().toISOString() };
  return { checkout: { ...account.pending, person: p.name, note: "Simulated checkout. No real payment." } };
}

export function confirmPurchase(account: Account) {
  const pending = account.pending;
  if (!pending) throw new NotFound("There is no purchase waiting for confirmation.");
  const p = structuredClone(account.people.find((x) => x.id === pending.personId)!);
  const next = p.dates.map((d) => ({ type: d.type, ...nextOccurrence(d) })).sort((a, b) => a.days - b.days)[0];
  const occasion = next ? `${next.type} ${next.date.getFullYear()}` : "No occasion";
  const same = p.gifts.find((g) => norm(g.title) === norm(pending.title));
  if (same) Object.assign(same, { status: "bought", priceUsd: pending.priceUsd, icon: pending.icon });
  else p.gifts.unshift({ id: id(), icon: pending.icon, title: pending.title, occasion, status: "bought", reaction: null, priceUsd: pending.priceUsd });
  account.pending = null;
  replace(account, p);
  return { order: `SIM-${randomBytes(3).toString("hex").toUpperCase()}`, title: pending.title, priceUsd: pending.priceUsd, person: p.name, simulated: true };
}

export function cancelPurchase(account: Account) {
  const had = account.pending;
  account.pending = null;
  return { cancelled: Boolean(had) };
}

export function recordGift(account: Account, ref: string, gift: { title: string; occasion?: string; status?: GiftStatus; reaction?: Reaction | null; icon?: string }) {
  const p = structuredClone(findPerson(account, ref));
  const existing = p.gifts.find((g) => norm(g.title) === norm(gift.title));
  if (existing) {
    if (gift.status) existing.status = gift.status;
    if (gift.reaction !== undefined) existing.reaction = gift.reaction;
  } else {
    p.gifts.unshift({ id: id(), icon: gift.icon ?? "gift", title: gift.title, occasion: gift.occasion ?? "Idea", status: gift.status ?? "idea", reaction: gift.reaction ?? null });
  }
  return replace(account, p);
}

/** Used by the web app: replace a whole person after an edit. */
export function putPerson(account: Account, person: Person) {
  if (!account.people.some((p) => p.id === person.id)) account.people.push(person);
  else replace(account, person);
  return person;
}

export function deletePerson(account: Account, personId: string) {
  account.people = account.people.filter((p) => p.id !== personId);
}
