const base = process.argv[2] ?? "http://localhost:8787";
const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
const history: { role: "user" | "assistant"; text: string }[] = [];
const lines = ["I want to add someone new. Let's do the gift interview.", "My mom, Carmen", "May 3rd, 1961", "Julio Iglesias and Mecano", "Paella and dark chocolate", "Gardening",
  "She has everything, but her knees hurt when she kneels", "Clutter. She hates knick-knacks", "Show me ideas, under 50 dollars"];
let total = 0;
for (const message of lines) {
  const t0 = Date.now();
  const reply = await (await fetch(`${base}/api/accounts/${id}/alexa`, { method: "POST", headers: { "Content-Type": "application/json", "x-judge-code": process.env.GQ_JUDGE_CODE ?? "" }, body: JSON.stringify({ message, fresh: history.length === 0 }) })).json();
  const ms = Date.now() - t0; total += ms;
  console.log(`YOU: ${message}\n  ALEXA (${ms} ms): ${reply.text}\n  tools: ${(reply.tools ?? []).map((t: { name: string }) => t.name).join(", ")}`);
  history.push({ role: "user", text: message }, { role: "assistant", text: reply.memory ?? reply.text });
}
const c = (await (await fetch(`${base}/api/accounts/${id}`)).json()).people.find((p: { name: string }) => p.name === "Carmen");
console.log("avg ms", Math.round(total / lines.length));
console.log("CARD", JSON.stringify({ rel: c?.relationship, dates: c?.dates?.length, likes: c?.likes, dislikes: c?.dislikes, hints: c?.hints?.map((h: { text: string }) => h.text), guesses: c?.guesses?.map((g: { text: string }) => g.text) }));
