// Live "Explore with Alexa" on Javier: gap-driven questions, each answer saved.
// Usage: npx tsx scripts/explore.ts
const base = process.argv[2] ?? "http://localhost:8787";
const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
const lines = ["Help me get to know Javier better.", "They keep saying they want to sleep better", "Experiences, definitely",
  "We're going to Lisbon in December", "Their favorite color is orange, and they wear size 38 shoes"];
let fresh = true;
for (const message of lines) {
  const t0 = Date.now();
  const r = await (await fetch(`${base}/api/accounts/${id}/alexa`, { method: "POST", headers: { "Content-Type": "application/json", "x-judge-code": process.env.GQ_JUDGE_CODE ?? "" }, body: JSON.stringify({ message, fresh }) })).json();
  fresh = false;
  console.log(`YOU: ${message}\n  ALEXA (${Date.now() - t0} ms): ${r.text}\n  tools: ${(r.tools ?? []).map((t: { name: string }) => t.name).join(", ")}`);
}
const m = (await (await fetch(`${base}/api/accounts/${id}`)).json()).people.find((p: { id: string }) => p.id === "javier");
console.log("HINTS", m.hints.map((h: { text: string }) => h.text));
console.log("GUESSES", m.guesses.map((g: { text: string }) => g.text));
