import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Person } from "../../../shared/types";
import { blankPerson } from "./seed";
import { newId } from "./id";
import { api } from "./api";

// Holds the demo account's people. Edits apply locally at once and are saved to the server
// shortly after; changes made by an assistant through MCP arrive through polling.
interface Store {
  /** Opens (or creates) the demo account. Pages that need data call it; the homepage does not. */
  ensureOpen: () => void;
  ready: boolean;
  error: string | null;
  accountId: string;
  people: Person[];
  currentId: string;
  current: Person;
  select: (id: string) => void;
  update: (id: string, fn: (p: Person) => Person) => void;
  addPerson: () => string;
  removePerson: (id: string) => void;
  reset: () => Promise<void>;
  refresh: (force?: boolean) => Promise<Person[] | null>;
  flashed: Set<string>; // "personId:block" keys that just changed
  flash: (personId: string, block: string) => void;
}

const Ctx = createContext<Store | null>(null);
const SAVE_DELAY_MS = 400;
const POLL_MS = 4000;

export function StoreProvider({ children }: { children: ReactNode }) {
  const [wanted, setWanted] = useState(false);
  const [accountId, setAccountId] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentId, setCurrentId] = useState("javier");
  const [flashed, setFlashed] = useState<Set<string>>(new Set());
  const peopleRef = useRef(people);
  peopleRef.current = people;
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  // open (or create) the demo account
  useEffect(() => {
    if (!wanted) return;
    let alive = true;
    // Retry a few times: the server may be restarting or waking up.
    (async () => {
      for (let attempt = 1; attempt <= 5 && alive; attempt++) {
        try {
          const a = await api.openAccount();
          if (alive) { setAccountId(a.id); setPeople(a.people); setReady(true); setError(null); }
          return;
        } catch {
          await new Promise((r) => setTimeout(r, 800 * attempt));
        }
      }
      if (alive) setError("We couldn't reach the GiftyQuest server. It may be restarting.");
    })();
    return () => { alive = false; };
  }, [wanted]);
  const ensureOpen = useCallback(() => setWanted(true), []);

  const saveSoon = useCallback((id: string) => {
    const t = timers.current;
    clearTimeout(t.get(id));
    t.set(id, setTimeout(() => {
      t.delete(id);
      const p = peopleRef.current.find((x) => x.id === id);
      if (p && accountId) api.savePerson(accountId, p).catch(() => setError("Your last change was not saved. Check your connection."));
    }, SAVE_DELAY_MS));
  }, [accountId]);

  const update = useCallback((id: string, fn: (p: Person) => Person) => {
    setPeople((list) => {
      const next = list.map((p) => (p.id === id ? fn(structuredClone(p)) : p));
      peopleRef.current = next;
      return next;
    });
    saveSoon(id);
  }, [saveSoon]);

  const addPerson = useCallback(() => {
    const id = newId();
    const p = blankPerson(id);
    setPeople((list) => (peopleRef.current = [...list, p]));
    setCurrentId(id);
    saveSoon(id);
    return id;
  }, [saveSoon]);

  const removePerson = useCallback((id: string) => {
    const next = peopleRef.current.filter((p) => p.id !== id);
    setPeople((peopleRef.current = next));
    setCurrentId((cur) => (cur === id ? next[0]?.id ?? "" : cur));
    if (accountId) api.deletePerson(accountId, id).catch(() => setError("We couldn't delete that person. Try again."));
  }, [accountId]);

  const reset = useCallback(async () => {
    if (!accountId) return;
    const fresh = await api.reset(accountId);
    setPeople((peopleRef.current = fresh));
    setCurrentId("javier");
  }, [accountId]);

  const refresh = useCallback(async (force = false): Promise<Person[] | null> => {
    if (!accountId || (!force && timers.current.size)) return null; // never overwrite edits that are still saving
    try {
      const a = await api.getAccount(accountId);
      if (!force && timers.current.size) return null;
      if (JSON.stringify(a.people) !== JSON.stringify(peopleRef.current)) setPeople((peopleRef.current = a.people));
      return a.people;
    } catch {
      return null; // keep the current view; the next poll will retry
    }
  }, [accountId]);

  // pick up changes made by assistants through MCP
  useEffect(() => {
    if (!accountId) return;
    const tick = () => { if (document.visibilityState === "visible") refresh(); };
    const t = setInterval(tick, POLL_MS);
    return () => clearInterval(t);
  }, [accountId, refresh]);

  const flash = useCallback((personId: string, block: string) => {
    const key = `${personId}:${block}`;
    setFlashed((s) => new Set(s).add(key));
    setTimeout(() => setFlashed((s) => { const n = new Set(s); n.delete(key); return n; }), 1600);
  }, []);

  const value = useMemo<Store>(() => {
    const current = people.find((p) => p.id === currentId) ?? people[0];
    return {
      ensureOpen, ready, error, accountId, people, currentId: current?.id ?? "", current,
      select: setCurrentId, update, addPerson, removePerson, reset, refresh, flashed, flash,
    };
  }, [ensureOpen, ready, error, accountId, people, currentId, update, addPerson, removePerson, reset, refresh, flashed, flash]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore must be used inside StoreProvider");
  return s;
}
