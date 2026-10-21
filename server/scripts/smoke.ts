// End-to-end check: create a demo account, connect a real MCP client, call the main tools.
// Usage: npx tsx scripts/smoke.ts [baseUrl]
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

const base = process.argv[2] ?? "http://localhost:8787";
const { id } = await (await fetch(`${base}/api/accounts`, { method: "POST" })).json();
const client = new Client({ name: "smoke", version: "0.0.1" });
const transport = new StreamableHTTPClientTransport(new URL(`${base}/mcp/${id}`));
await client.connect(transport);
console.log("protocol", transport.protocolVersion);
console.log("tools", (await client.listTools()).tools.map((t) => t.name).join(", "));
console.log("prompts", (await client.listPrompts()).prompts.map((p) => p.name).join(", "));

const call = async (name: string, args: Record<string, unknown> = {}) => {
  const r = await client.callTool({ name, arguments: args });
  const text = (r.content as { text: string }[])[0]?.text ?? "";
  console.log(`\n# ${name} ${r.isError ? "(error)" : ""}\n${text.slice(0, 300)}`);
};
await call("list_people");
await call("add_hint", { person: "my girlfriend", text: "Wants to learn pottery" });
await call("create_person", { name: "Carmen", relationship: "Mother", voiceAlias: "my mom", pronoun: "her" });
await call("update_profile", { person: "mom", date: { type: "Birthday", month: 5, day: 3, year: 1961 } });
await call("add_preference", { person: "Carmen", kind: "hobbies", values: ["Gardening"] });
await call("suggest_gifts", { person: "Carmen", maxUsd: 50 });
await call("start_purchase", { person: "Carmen", title: "Garden kneeler and seat with soft pad", priceUsd: 42, icon: "armchair" });
await call("confirm_purchase");
await call("get_profile", { person: "nobody" });
const acct = await (await fetch(`${base}/api/accounts/${id}`)).json();
console.log("\npeople now:", acct.people.map((p: { name: string; gifts: unknown[] }) => `${p.name} (${p.gifts.length} gifts)`).join(", "));
await client.close();
