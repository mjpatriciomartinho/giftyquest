import { NotFound } from "../core/gifts";
import type { Account, AccountRepo } from "./repo";

// Serializes writes per account inside one process, so two quick edits never overwrite each other.
const queues = new Map<string, Promise<unknown>>();

export async function withAccount<T>(repo: AccountRepo, accountId: string, write: boolean, fn: (a: Account) => T): Promise<T> {
  const prev = queues.get(accountId) ?? Promise.resolve();
  const job = prev.catch(() => undefined).then(async () => {
    const account = await repo.get(accountId);
    if (!account) throw new NotFound("This demo account does not exist or has expired. Open GiftyQuest again to get a new one.");
    const result = fn(account);
    if (write) await repo.save(account);
    return result;
  });
  queues.set(accountId, job);
  try {
    return await job;
  } finally {
    if (queues.get(accountId) === job) queues.delete(accountId);
  }
}
