import type { Person } from "../../../shared/types";

const KEY = "giftyquest.account";

interface AccountDto { id: string; expiresAt: number; people: Person[] }

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(path, { ...init, headers: { "Content-Type": "application/json", ...init?.headers } });
  if (!r.ok) throw Object.assign(new Error(`HTTP ${r.status}`), { status: r.status });
  return (r.status === 204 ? undefined : await r.json()) as T;
}

function stored(): string | null {
  try { return localStorage.getItem(KEY); } catch { return null; }
}
function remember(id: string) {
  try { localStorage.setItem(KEY, id); } catch { /* private mode: account lasts for this tab */ }
}

export const api = {
  /** Reuse this browser's demo account, or create a fresh one if it is missing or expired. */
  async openAccount(): Promise<AccountDto> {
    const id = stored();
    if (id) {
      try { return await req<AccountDto>(`/api/accounts/${id}`); } catch (e) {
        if ((e as { status?: number }).status !== 404) throw e;
      }
    }
    const created = await req<{ id: string }>("/api/accounts", { method: "POST" });
    remember(created.id);
    return req<AccountDto>(`/api/accounts/${created.id}`);
  },
  getAccount: (id: string) => req<AccountDto>(`/api/accounts/${id}`),
  savePerson: (id: string, p: Person) => req<Person>(`/api/accounts/${id}/people/${p.id}`, { method: "PUT", body: JSON.stringify(p) }),
  deletePerson: (id: string, personId: string) => req<void>(`/api/accounts/${id}/people/${personId}`, { method: "DELETE" }),
  reset: async (id: string) => (await req<{ people: Person[] }>(`/api/accounts/${id}/reset`, { method: "POST" })).people,
};

const CODE_KEY = "giftyquest.judgeCode";
export const judgeCode = {
  get(): string { try { return localStorage.getItem(CODE_KEY) ?? ""; } catch { return ""; } },
  set(v: string) { try { localStorage.setItem(CODE_KEY, v); } catch { /* ignore */ } },
};

export interface LiveCard {
  type: "ideas" | "checkout" | "receipt";
  person: string;
  ideas?: { title: string; priceUsd: number; why: string; icon: string; basedOn?: string[]; product?: { asin: string; title: string; imageUrl: string | null; price: string | null; url: string } | null; searchUrl?: string }[];
  title?: string; priceUsd?: number; icon?: string; order?: string;
}
export interface LiveReply { text: string; memory: string; tools: { name: string; args: Record<string, unknown>; isError: boolean }[]; cards: LiveCard[] }

export const live = {
  status: () => req<{ live: boolean; needsCode: boolean; model: string }>("/api/alexa/status", { headers: { "x-judge-code": judgeCode.get() } }),
  /** fresh=true starts a new conversation; otherwise the server continues the saved one. */
  say: (accountId: string, message: string, fresh: boolean) =>
    req<LiveReply>(`/api/accounts/${accountId}/alexa`, { method: "POST", headers: { "x-judge-code": judgeCode.get() }, body: JSON.stringify({ message, fresh }) }),
  /** The user opened Alexa: she speaks first with the briefing, in a new conversation. */
  open: (accountId: string) =>
    req<LiveReply>(`/api/accounts/${accountId}/alexa`, { method: "POST", headers: { "x-judge-code": judgeCode.get() }, body: JSON.stringify({ opened: true }) }),
};

export const mcpUrl = (accountId: string) => `${location.origin}/mcp/${accountId}`;
