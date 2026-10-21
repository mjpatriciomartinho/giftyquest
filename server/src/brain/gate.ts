// Keeps Bedrock spend bounded: live Alexa needs the judge code (when one is configured)
// and each account gets a daily number of turns.
import { timingSafeEqual } from "node:crypto";
import { GetParameterCommand, SSMClient } from "@aws-sdk/client-ssm";

let JUDGE_CODE = process.env.GQ_JUDGE_CODE ?? "";
// On AWS the judge code lives in SSM (GQ_JUDGE_CODE_SSM names the parameter); read it once at start.
export const judgeCodeReady = (async () => {
  const name = process.env.GQ_JUDGE_CODE_SSM;
  if (!name || JUDGE_CODE) return;
  const res = await new SSMClient({}).send(new GetParameterCommand({ Name: name, WithDecryption: true }));
  const raw = res.Parameter?.Value ?? "";
  JUDGE_CODE = raw.match(/^\s*GQ_JUDGE_CODE\s*=\s*(.+)\s*$/m)?.[1]?.trim() ?? raw.trim();
  if (!JUDGE_CODE) throw new Error("Judge code parameter is empty");
})();
const TURNS_PER_DAY = Number(process.env.GQ_TURNS_PER_DAY ?? 120);
const used = new Map<string, { day: string; n: number }>();

export function liveAccess(code: string | undefined) {
  if (!JUDGE_CODE) return { needsCode: false, unlocked: true }; // local development
  const a = Buffer.from(code ?? ""), b = Buffer.from(JUDGE_CODE);
  return { needsCode: true, unlocked: a.length === b.length && timingSafeEqual(a, b) };
}

export function allowLiveTurn(accountId: string) {
  const day = new Date().toISOString().slice(0, 10);
  const u = used.get(accountId);
  const next = u && u.day === day ? u.n + 1 : 1;
  if (next > TURNS_PER_DAY) return false;
  used.set(accountId, { day, n: next });
  return true;
}
