import type { Person } from "./types";

// Example products. Invented for the prototype; "Find on Amazon" opens a real search.
export interface Idea {
  icon: string;
  title: string;
  price: number;
  why: string;
  query: string;
  basedOn?: string[]; // the profile signals the idea combines
  product?: {
    asin: string; title: string; imageUrl: string | null; price: string | null; url: string;
  } | null; // matching real Amazon product, when the affiliate store is connected
  searchUrl?: string; // Amazon search in the configured store, with the affiliate tag
}

export const amazonSearch = (q: string) => `https://www.amazon.com/s?k=${encodeURIComponent(q)}`;

export type Theme = "base" | "summer" | "treat";

const HANDMADE: Record<string, Partial<Record<Theme, Idea[]>>> = {
  javier: {
    base: [
      { icon: "dumbbell", title: "Orange leather lifting belt, hand-stitched", price: 69, why: "Mixes their powerlifting with their favorite color, in the handmade style of the ceramic lamp they loved in March", query: "leather powerlifting belt orange", basedOn: ["powerlifting", "orange", "ceramic lamp hint"] },
      { icon: "camera", title: "Film photo walk and darkroom workshop for two", price: 75, why: "Their light meter broke, so a guided photo walk with a loaner camera plus developing the roll together makes the anniversary an experience", query: "film photography darkroom workshop", basedOn: ["film photography", "light meter hint", "anniversary"] },
      { icon: "dice-5", title: "Handmade wooden medieval chess set", price: 58, why: "Age of Empires on the table: castles, knights and a game for two, made by hand like the lamp they admired", query: "handmade wooden medieval chess set", basedOn: ["Age of Empires", "ceramic lamp hint", "anniversary"] },
    ],
    summer: [
      { icon: "sun", title: "Linen beach blanket in orange", price: 48, why: "Beach days plus their favorite color, natural linen", query: "linen beach blanket orange" },
      { icon: "camera", title: "Waterproof single-use film cameras, 3 pack", price: 39, why: "Film photography that survives the beach", query: "waterproof disposable film camera 3 pack" },
      { icon: "dumbbell", title: "Sandbag training kit for beach workouts", price: 45, why: "Powerlifting and beach days in one, and their 2025 powerlifting gift was a hit", query: "sandbag training kit" },
    ],
  },
  carmen: {
    base: [
      { icon: "armchair", title: "Garden kneeler and seat with soft pad", price: 42, why: "Gardening is her thing and her knees hurt when she kneels", query: "garden kneeler seat padded" },
      { icon: "candy", title: "Dark chocolate tasting box", price: 35, why: "She loves dark chocolate, and it gets eaten, not stored", query: "dark chocolate tasting box gift" },
      { icon: "disc-3", title: "Mecano greatest hits on vinyl", price: 29, why: "One of the artists you named", query: "Mecano vinyl" },
    ],
    treat: [
      { icon: "chef-hat", title: "Paella cooking class for two", price: 49, why: "Her favorite dish, and an experience leaves no clutter", query: "paella cooking class" },
      { icon: "flower-2", title: "Three months of seasonal flowers", price: 45, why: "Fits a gardener and disappears in a week, no knick-knacks", query: "flower subscription 3 months" },
      { icon: "ticket", title: "Two tickets to a Julio Iglesias tribute night", price: 50, why: "Her favorite singer, a night out instead of an object", query: "Julio Iglesias tribute concert tickets" },
    ],
  },
};

function generic(p: Person, theme: Theme): Idea[] {
  const h = p.likes.hobbies[0] ?? "their favorite hobby";
  const f = p.likes.food[0] ?? "good food";
  const m = p.likes.music[0] ?? "their favorite artist";
  if (theme === "treat") {
    return [
      { icon: "ticket", title: `Concert or tribute night: ${m}`, price: 50, why: `They love ${m}`, query: `${m} tickets` },
      { icon: "chef-hat", title: `${f} cooking class for two`, price: 48, why: `${f} is a favorite`, query: `${f} cooking class` },
    ];
  }
  return [
    { icon: "sparkles", title: `Something new for ${h.toLowerCase()}`, price: 40, why: `They spend weekends on ${h.toLowerCase()}`, query: `${h} gift` },
    { icon: "utensils", title: `${f} gift box`, price: 35, why: `${f} is one of their favorites`, query: `${f} gift box` },
    { icon: "disc-3", title: `${m} on vinyl`, price: 29, why: "One of the artists you named", query: `${m} vinyl` },
  ];
}

export function ideasFor(p: Person, theme: Theme, maxUsd: number | null): Idea[] {
  const key = p.id === "javier" ? "javier" : p.name === "Carmen" ? "carmen" : null;
  const set = (key && (HANDMADE[key][theme] ?? HANDMADE[key].base)) || generic(p, theme);
  return maxUsd ? set.filter((i) => i.price <= maxUsd) : set;
}

// Trending: example picks for now. Each one lists keywords used to match people's profiles.
export interface TrendingItem {
  icon: string;
  title: string;
  price: number;
  note: string;
  cats: string[];
  matches: string[];
}

export const TRENDING: TrendingItem[] = [
  { icon: "camera", title: "Instant film camera", price: 69, cats: ["her", "him"], note: "Prints a photo in seconds. Big again this year.", matches: ["film", "photo"] },
  { icon: "dumbbell", title: "Lifting chalk and wrist wraps set", price: 24, cats: ["her", "him", "under50"], note: "Better grip and steadier wrists on heavy lifts.", matches: ["powerlifting", "lifting"] },
  { icon: "soup", title: "Ramen kit of the month, 3 boxes", price: 45, cats: ["her", "him", "under50"], note: "Noodles, broth and toppings from small makers.", matches: ["ramen"] },
  { icon: "shovel", title: "Ergonomic garden tool set", price: 45, cats: ["mom", "under50"], note: "Soft grips that are kind to hands and wrists.", matches: ["garden"] },
  { icon: "dice-5", title: "Cooperative board game for game night", price: 30, cats: ["him", "under50"], note: "Everyone wins or loses together.", matches: ["board game"] },
  { icon: "palette", title: "Pottery class for two", price: 60, cats: ["her", "experience"], note: "Make something with your hands, together.", matches: ["ceramic", "handmade"] },
  { icon: "coffee", title: "Portable espresso maker", price: 55, cats: ["him"], note: "Real espresso on a hike, no batteries.", matches: ["coffee", "camping"] },
  { icon: "moon", title: "Silk sleep mask", price: 28, cats: ["her", "mom", "under50"], note: "Soft on skin, blocks all light.", matches: ["sleep"] },
  { icon: "ticket", title: "Live music gift card", price: 50, cats: ["experience", "under50"], note: "They pick the concert.", matches: ["music"] },
];

export const TRENDING_FILTERS: [string, string][] = [
  ["all", "All"], ["her", "For her"], ["him", "For him"], ["mom", "For mom"], ["experience", "Experiences"], ["under50", "Under $50"],
];

export function fitFor(item: TrendingItem, people: Person[]): { person: Person; because: string } | null {
  for (const p of people) {
    const pool = [...Object.values(p.likes).flat(), ...p.hints.map((h) => h.text), ...p.guesses.map((g) => g.text)];
    const hit = pool.find((x) => item.matches.some((m) => x.toLowerCase().includes(m)));
    if (hit) return { person: p, because: hit };
  }
  return null;
}
