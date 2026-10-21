// HTTP entry: the REST API used by the web app and the MCP endpoint used by assistants.
// Runtime-agnostic (Hono): node.ts serves it locally, a Lambda handler will serve it on AWS.
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import type { Person } from "../../shared/types";
import { seedPeople } from "../../shared/seed";
import * as gifts from "./core/gifts";
import { buildMcpServer } from "./mcp";
import { MODEL_ID, runAlexa } from "./brain/alexa";
import { allowLiveTurn, judgeCodeReady, liveAccess } from "./brain/gate";
import type { AccountRepo } from "./store/repo";
import { withAccount } from "./store/lock";

export function createApp(repo: AccountRepo) {
  const app = new Hono();

  app.onError((err, c) => {
    if (err instanceof gifts.NotFound) return c.json({ error: err.message }, 404);
    console.error(err);
    return c.json({ error: "Something went wrong on our side." }, 500);
  });

  app.get("/api/health", (c) => c.json({ ok: true }));

  // ---- demo accounts ----
  app.post("/api/accounts", async (c) => {
    const a = await repo.create();
    return c.json({ id: a.id, expiresAt: a.expiresAt }, 201);
  });

  app.get("/api/accounts/:id", async (c) => {
    const a = await withAccount(repo, c.req.param("id"), false, (x) => x);
    return c.json({ id: a.id, expiresAt: a.expiresAt, people: a.people, pending: a.pending });
  });

  app.post("/api/accounts/:id/reset", async (c) => {
    const people = await withAccount(repo, c.req.param("id"), true, (a) => {
      a.people = seedPeople();
      a.pending = null;
      a.alexa = [];
      return a.people;
    });
    return c.json({ people });
  });

  // ---- people (the web app saves a whole card after each edit) ----
  app.put("/api/accounts/:id/people/:pid", bodyLimit({ maxSize: 100 * 1024 }), async (c) => {
    const body = (await c.req.json()) as Person;
    if (!body || body.id !== c.req.param("pid") || typeof body.name !== "string") return c.json({ error: "Invalid person." }, 400);
    const person = await withAccount(repo, c.req.param("id"), true, (a) => gifts.putPerson(a, body));
    return c.json(person);
  });

  app.delete("/api/accounts/:id/people/:pid", async (c) => {
    await withAccount(repo, c.req.param("id"), true, (a) => gifts.deletePerson(a, c.req.param("pid")));
    return c.body(null, 204);
  });

  // ---- simulated Alexa+ (Amazon Nova on Bedrock), only for judges ----
  // Never open the live assistant by accident: wait for the judge code before answering.
  app.use("/api/*", async (_c, next) => { await judgeCodeReady; await next(); });

  app.get("/api/alexa/status", (c) => {
    const { needsCode, unlocked } = liveAccess(c.req.header("x-judge-code"));
    return c.json({ live: unlocked, needsCode, model: MODEL_ID });
  });

  app.post("/api/accounts/:id/alexa", bodyLimit({ maxSize: 64 * 1024 }), async (c) => {
    if (!liveAccess(c.req.header("x-judge-code")).unlocked) return c.json({ error: "live_locked" }, 403);
    const accountId = c.req.param("id");
    if (!(await repo.get(accountId))) return c.json({ error: "Unknown or expired account." }, 404);
    if (!allowLiveTurn(accountId)) return c.json({ error: "rate_limited" }, 429);
    const { message, fresh } = (await c.req.json()) as { message?: string; fresh?: boolean };
    if (!message || typeof message !== "string" || message.length > 1000) return c.json({ error: "Invalid message." }, 400);
    return c.json(await runAlexa(repo, accountId, message, fresh === true));
  });

  // ---- MCP (Streamable HTTP, stateless, spec 2025-11-25) ----
  // The account id in the URL scopes every tool to one demo account.
  app.all("/mcp/:id", bodyLimit({ maxSize: 256 * 1024 }), async (c) => {
    if (c.req.method !== "POST") {
      return c.json({ jsonrpc: "2.0", error: { code: -32000, message: "Method not allowed." }, id: null }, 405);
    }
    const accountId = c.req.param("id");
    if (!(await repo.get(accountId))) {
      return c.json({ jsonrpc: "2.0", error: { code: -32001, message: "Unknown or expired account." }, id: null }, 404);
    }
    const server = buildMcpServer(repo, accountId);
    const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
    await server.connect(transport);
    try {
      return await transport.handleRequest(c.req.raw);
    } finally {
      await server.close();
    }
  });

  return app;
}
