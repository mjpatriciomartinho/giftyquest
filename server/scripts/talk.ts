// Talks to the live Alexa simulation (Nova on Bedrock) through the API, like the web app does.
// Usage: npx tsx scripts/talk.ts [baseUrl]
const base = process.argv[2] ?? "http://localhost:8787";
const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
const history: { role: "user" | "assistant"; text: string }[] = [];
const lines = [
  "Alexa, note that my girlfriend wants to learn pottery",
  "Can you give me gift ideas for our anniversary?",
  "Under 80 dollars",
  "Buy the first one",
  "Yes, order it",
];
for (const message of lines) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/accounts/${id}/alexa`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-judge-code": process.env.GQ_JUDGE_CODE ?? "" }, body: JSON.stringify({ message, fresh: history.length === 0 }),
  });
  const reply = await r.json();
  console.log(`\nYOU: ${message}\nALEXA (${Date.now() - t0} ms): ${reply.text ?? JSON.stringify(reply)}`);
  for (const t of reply.tools ?? []) console.log(`  tool ${t.name}${t.isError ? " (error)" : ""} ${JSON.stringify(t.args).slice(0, 120)}`);
  for (const c of reply.cards ?? []) console.log(`  card ${c.type} ${JSON.stringify(c).slice(0, 300)}`);
  history.push({ role: "user", text: message }, { role: "assistant", text: reply.memory ?? reply.text ?? "" });
}
const acct = await (await fetch(`${base}/api/accounts/${id}`)).json();
const javier = acct.people.find((p: { id: string }) => p.id === "javier");
console.log("\nJavier hints:", javier.hints.map((h: { text: string }) => h.text));
console.log("Javier gifts:", javier.gifts.map((g: { title: string; status: string }) => `${g.title} [${g.status}]`));
