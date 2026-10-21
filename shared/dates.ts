import type { DateEntry, Person } from "./types";

export const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export function today(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function todayIso(): string {
  const d = today();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function nextOccurrence(entry: DateEntry): { date: Date; days: number } {
  const now = today();
  let next = new Date(now.getFullYear(), entry.month, entry.day);
  if (next < now) next = new Date(now.getFullYear() + 1, entry.month, entry.day);
  return { date: next, days: Math.round((next.getTime() - now.getTime()) / 86_400_000) };
}

export function soonest(person: Person) {
  return person.dates
    .map((d) => ({ ...d, ...nextOccurrence(d) }))
    .sort((a, b) => a.days - b.days)[0];
}

export function formatDate(entry: DateEntry): string {
  return `${MONTHS[entry.month]} ${entry.day}${entry.year ? `, ${entry.year}` : ""}`;
}

export function inDays(days: number): string {
  if (days === 0) return "today";
  if (days === 1) return "tomorrow";
  return `in ${days} days`;
}
