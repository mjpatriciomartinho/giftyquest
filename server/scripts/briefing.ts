// Live Alexa: she speaks first with the briefing, then the user answers with a budget.
// Usage: npx tsx scripts/briefing.ts [baseUrl]
const base = process.argv[2] ?? "http://localhost:8787";
const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
const turns: { opened?: boolean; message?: string }[] = [{ opened: true }, { message: "Under 80 dollars" }];
for (const body of turns) {
  const t0 = Date.now();
  const r = await fetch(`${base}/api/accounts/${id}/alexa`, {
    method: "POST", headers: { "Content-Type": "application/json", "x-judge-code": process.env.GQ_JUDGE_CODE ?? "" }, body: JSON.stringify(body),
  });
  const reply = await r.json();
  console.log(`\nYOU: ${body.message ?? "(opens Alexa)"}\nALEXA (${Date.now() - t0} ms): ${reply.text ?? JSON.stringify(reply)}`);
  for (const t of reply.tools ?? []) console.log(`  tool ${t.name}${t.isError ? " (error)" : ""} ${JSON.stringify(t.args).slice(0, 120)}`);
  for (const c of reply.cards ?? []) {
    if (c.type !== "ideas") { console.log(`  card ${c.type} ${JSON.stringify(c).slice(0, 200)}`); continue; }
    for (const i of c.ideas) console.log(`  idea ${i.title} ($${i.priceUsd}) [${(i.basedOn ?? []).join(", ")}]`);
  }
}
