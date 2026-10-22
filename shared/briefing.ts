import { MONTHS, nextOccurrence, today } from "./dates";
import type { Person, Pronoun, Reaction } from "./types";

export interface BriefingItem {
  personId: string;
  person: string;
  pronoun: Pronoun; // her, him or them: use it when speaking about the person
  occasion: string; // "Anniversary", "Birthday", ...
  date: string; // "November 2"
  inDays: number;
  giftReady: string | null; // title of a gift already bought for this occasion
  recentHints: { text: string; date: string }[];
  avoid: { title: string; reaction: Reaction }[]; // past gifts that did not land
}

const HINT_WINDOW_DAYS = 365;

/**
 * What deserves the user's attention when they open the assistant: upcoming dates, whether a gift
 * is already sorted, the newest hints to build on and past gifts that did not land.
 * Most urgent first: dates without a gift come before dates that are covered.
 */
export function briefing(people: Person[], withinDays = 45): BriefingItem[] {
  const since = today().getTime() - HINT_WINDOW_DAYS * 86_400_000;
  return people
    .flatMap((p) => p.dates.map((d) => {
      const next = nextOccurrence(d);
      const occasion = `${d.type} ${next.date.getFullYear()}`;
      const ready = p.gifts.find((g) => (g.status === "bought" || g.status === "wrapped") && g.occasion === occasion);
      return {
        personId: p.id,
        person: p.name,
        pronoun: p.pronoun,
        occasion: d.type,
        date: `${MONTHS[d.month]} ${d.day}`,
        inDays: next.days,
        giftReady: ready?.title ?? null,
        recentHints: p.hints
          .filter((h) => new Date(h.date).getTime() >= since)
          .sort((a, b) => b.date.localeCompare(a.date))
          .slice(0, 3)
          .map((h) => ({ text: h.text, date: h.date })),
        avoid: p.gifts.filter((g) => g.reaction === "disliked" || g.reaction === "meh").map((g) => ({ title: g.title, reaction: g.reaction! })),
      };
    }))
    .filter((x) => x.inDays <= withinDays)
    .sort((a, b) => Number(Boolean(a.giftReady)) - Number(Boolean(b.giftReady)) || a.inDays - b.inDays);
}
