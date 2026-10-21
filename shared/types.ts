// Domain model shared by the web app and (later) the API and MCP server.

export type Via = "voice" | "web";
export type Pronoun = "her" | "him" | "them";

export interface DateEntry {
  id: string;
  type: string; // "Birthday", "Anniversary", ...
  month: number; // 0-11
  day: number;
  year: number | null; // optional, used for age
}

export interface Hint {
  id: string;
  text: string;
  date: string; // YYYY-MM-DD
  via: Via;
}

export interface Guess {
  id: string;
  text: string;
  why: string;
  kept: boolean; // false until the user keeps it
}

export type GiftStatus = "idea" | "bought" | "wrapped" | "given";
export type Reaction = "loved" | "liked" | "meh" | "disliked";

export interface Gift {
  id: string;
  icon: string; // Lucide icon name, kebab-case
  title: string;
  occasion: string;
  status: GiftStatus;
  reaction: Reaction | null;
  priceUsd?: number;
}

export type SizeKey = "top" | "pants" | "shoes" | "ring";

export interface Likes {
  music: string[];
  food: string[];
  hobbies: string[];
  colors: string[];
  brands: string[];
}

export interface Person {
  id: string;
  name: string;
  relationship: string;
  voiceAlias: string; // how the user refers to them when talking to Alexa
  pronoun: Pronoun;
  dates: DateEntry[];
  sizes: Partial<Record<SizeKey, string>>;
  likes: Likes;
  dislikes: string[];
  allergies: string[];
  hints: Hint[];
  guesses: Guess[];
  gifts: Gift[];
}

export const SIZE_LABELS: Record<SizeKey, string> = {
  top: "Top",
  pants: "Pants",
  shoes: "Shoes",
  ring: "Ring",
};

export const LIKE_LABELS: Record<keyof Likes, string> = {
  music: "Music",
  food: "Food",
  hobbies: "Hobbies",
  colors: "Colors",
  brands: "Brands",
};

export const STATUS_LABELS: Record<GiftStatus, string> = {
  idea: "Idea",
  bought: "Bought",
  wrapped: "Wrapped",
  given: "Given",
};

export const REACTION_LABELS: Record<Reaction, string> = {
  loved: "Loved it",
  liked: "Liked it",
  meh: "Indifferent",
  disliked: "Didn't like it",
};
