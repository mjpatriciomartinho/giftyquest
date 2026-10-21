import type { Person } from "./types";

// Example people shown to every new visitor. Clearly fake data.
export function seedPeople(): Person[] {
  return [
    {
      id: "maria",
      name: "María",
      relationship: "Partner",
      voiceAlias: "my girlfriend",
      pronoun: "her",
      dates: [
        { id: "d1", type: "Anniversary", month: 10, day: 2, year: 2021 },
        { id: "d2", type: "Birthday", month: 6, day: 14, year: 1994 },
      ],
      sizes: { top: "M (US) / 38 (EU)", pants: "28 (US) / 38 (EU)", shoes: "7.5 (US) / 38 (EU)", ring: "6 (US)" },
      likes: {
        music: ["Rosalía", "Bad Bunny"],
        food: ["Sushi", "Ramen"],
        hobbies: ["Yoga", "Film photography", "Beach days"],
        colors: ["Sage green", "Ivory"],
        brands: ["Patagonia"],
      },
      dislikes: ["Perfume", "Glitter", "Gadgets that need charging"],
      allergies: ["Nickel"],
      hints: [
        { id: "h1", text: "Loved the ceramic lamp at her sister's place", date: "2026-03-12", via: "voice" },
        { id: "h2", text: "The light meter on her film camera broke", date: "2026-08-02", via: "web" },
      ],
      guesses: [
        { id: "g1", text: "Likes handmade things in natural materials", why: "ceramic lamp hint, sage and ivory colors, Patagonia", kept: true },
        { id: "g2", text: "Jewelry must be nickel-free", why: "nickel allergy", kept: true },
      ],
      gifts: [
        { id: "x1", icon: "flower-2", title: "Yoga retreat day pass", occasion: "Birthday 2025", status: "given", reaction: "loved" },
        { id: "x2", icon: "watch", title: "Smartwatch", occasion: "Christmas 2025", status: "given", reaction: "disliked" },
      ],
    },
    {
      id: "dani",
      name: "Dani",
      relationship: "Friend",
      voiceAlias: "Dani",
      pronoun: "him",
      dates: [{ id: "d3", type: "Birthday", month: 0, day: 22, year: null }],
      sizes: { top: "L (US)" },
      likes: { music: ["Arctic Monkeys"], food: ["Tacos"], hobbies: ["Board games"], colors: [], brands: [] },
      dislikes: [],
      allergies: [],
      hints: [],
      guesses: [],
      gifts: [{ id: "x3", icon: "dice-5", title: "Wingspan board game", occasion: "Birthday 2026", status: "given", reaction: "loved" }],
    },
  ];
}

export function blankPerson(id: string): Person {
  return {
    id,
    name: "New person",
    relationship: "",
    voiceAlias: "",
    pronoun: "them",
    dates: [],
    sizes: {},
    likes: { music: [], food: [], hobbies: [], colors: [], brands: [] },
    dislikes: [],
    allergies: [],
    hints: [],
    guesses: [],
    gifts: [],
  };
}
