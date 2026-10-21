// Local server. On AWS the same app runs inside a Lambda handler instead.
import { serve } from "@hono/node-server";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { FileRepo } from "./store/repo";

const dataDir = fileURLToPath(new URL("../.data/accounts", import.meta.url));
const port = Number(process.env.PORT ?? 8787);

serve({ fetch: createApp(new FileRepo(dataDir)).fetch, port }, () => {
  console.log(`GiftyQuest API and MCP server on http://localhost:${port}`);
});
