import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { join } from "node:path";
import type { Person } from "../../../shared/types";
import { seedPeople } from "../../../shared/seed";

export interface PendingPurchase {
  personId: string;
  title: string;
  icon: string;
  priceUsd: number;
  createdAt: string;
}

export interface Account {
  id: string;
  createdAt: string;
  expiresAt: number; // epoch seconds; demo accounts expire after 24 hours
  people: Person[];
  pending: PendingPurchase | null;
  /** The Alexa conversation in Bedrock Converse format, tool calls included. Trimmed to the last turns. */
  alexa?: unknown[];
}

// Storage behind an interface so the local file store can be swapped for DynamoDB on AWS.
export interface AccountRepo {
  create(): Promise<Account>;
  get(id: string): Promise<Account | null>;
  save(account: Account): Promise<void>;
}

export const DEMO_TTL_SECONDS = 24 * 60 * 60;

export function newAccount(): Account {
  return {
    id: randomBytes(16).toString("hex"),
    createdAt: new Date().toISOString(),
    expiresAt: Math.floor(Date.now() / 1000) + DEMO_TTL_SECONDS,
    people: seedPeople(),
    pending: null,
  };
}

const VALID_ID = /^[a-f0-9]{32}$/;

export class FileRepo implements AccountRepo {
  constructor(private dir: string) {}

  private path(id: string) {
    return join(this.dir, `${id}.json`);
  }

  async create() {
    const account = newAccount();
    await this.save(account);
    return account;
  }

  async get(id: string) {
    if (!VALID_ID.test(id)) return null;
    try {
      const account = JSON.parse(await readFile(this.path(id), "utf8")) as Account;
      if (account.expiresAt < Date.now() / 1000) {
        await rm(this.path(id), { force: true });
        return null;
      }
      return account;
    } catch {
      return null;
    }
  }

  async save(account: Account) {
    await mkdir(this.dir, { recursive: true });
    await writeFile(this.path(account.id), JSON.stringify(account, null, 2));
  }
}
