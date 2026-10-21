const base = process.argv[2] ?? "http://localhost:8787";
for (let run = 1; run <= 1; run++) {
  const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
  const say = async (message: string, fresh = false) => (await fetch(`${base}/api/accounts/${id}/alexa`, { method: "POST", headers: { "Content-Type": "application/json", "x-judge-code": process.env.GQ_JUDGE_CODE ?? "" }, body: JSON.stringify({ message, fresh }) })).json();
  await say("Alexa, note that my girlfriend wants to learn pottery", true);
  const r = await say("Gift ideas for our anniversary, under 80 dollars");
  console.log(`\n--- run ${run}\nALEXA: ${r.text}`);
  for (const c of r.cards ?? []) for (const i of c.ideas ?? []) console.log(`• ${i.title} $${i.priceUsd}\n   why: ${i.why}\n   mixes: ${(i.basedOn ?? []).join(" + ")}\n   amazon: ${i.product ? `${i.product.title} ${i.product.price}` : "no product"} | ${i.searchQuery ?? ""} | ${i.searchUrl ?? ""}`);
}
