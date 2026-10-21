import { useState } from "react";
import type { GiftStatus, Likes, Person, Pronoun, Reaction, SizeKey } from "../../../shared/types";
import { LIKE_LABELS, REACTION_LABELS, SIZE_LABELS, STATUS_LABELS } from "../../../shared/types";
import { MONTHS, formatDate, inDays, nextOccurrence, soonest, todayIso } from "../lib/dates";
import { newId } from "../lib/id";
import { useStore } from "../lib/store";
import {
  Ban, CalendarHeart, Compass, Gift, Heart, Keyboard, Leaf, Mic, NamedIcon, NotebookPen, Pencil, Plus, Ruler, Sparkles, Trash2, X,
} from "../lib/icons";
import { Block, Empty } from "./Block";
import { TagEditor } from "./TagEditor";

type Section = "head" | "dates" | "sizes" | "likes" | "dislikes" | "allergies" | "hints" | "gifts";

export function PersonCard({ onExplore }: { onExplore?: () => void }) {
  const { current: p, update, removePerson, flashed } = useStore();
  const [editing, setEditing] = useState<Section | null>(null);
  if (!p) return null;

  const set = (fn: (p: Person) => Person) => update(p.id, fn);
  const toggle = (s: Section) => () => setEditing((e) => (e === s ? null : s));
  const isFlash = (b: string) => flashed.has(`${p.id}:${b}`);
  const next = p.dates.length ? soonest(p) : null;

  return (
    <article className="grid min-w-0 gap-5 rounded-3xl bg-card p-5 sm:p-6" aria-live="polite">
      {/* head */}
      <div className={`flex flex-wrap items-center gap-4 rounded-2xl ${isFlash("head") ? "flash" : ""}`}>
        <div className="grid size-16 shrink-0 place-items-center rounded-full bg-peach-soft font-display text-3xl font-semibold text-peach-ink">
          {p.name[0] ?? "?"}
        </div>
        {editing === "head" ? (
          <HeadEditor person={p} onChange={set} onDone={() => setEditing(null)} onDelete={() => removePerson(p.id)} />
        ) : (
          <>
            <div className="min-w-0">
              <h2 className="font-display text-4xl font-semibold leading-tight">{p.name}</h2>
              <p className="text-sm text-muted">
                {p.relationship || "Relationship not set"}
                {p.voiceAlias && <> · Alexa knows {p.pronoun} as <b className="font-bold text-ink">“{p.voiceAlias}”</b></>}
              </p>
            </div>
            <button type="button" onClick={toggle("head")} className="btn bg-dove text-muted hover:text-ink" aria-label="Edit name and relationship">
              <Pencil className="size-3.5" />Edit
            </button>
            {onExplore && (
              <button type="button" onClick={onExplore} className="btn bg-lilac-soft text-lilac">
                <Compass className="size-3.5" />Explore with Alexa
              </button>
            )}
            {next && (
              <div className="ml-auto flex items-center gap-2 rounded-xl bg-peach-soft px-4 py-2 text-sm font-bold text-peach-ink">
                <CalendarHeart className="size-4" />{next.type} {inDays(next.days)}
              </div>
            )}
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-full bg-mint" />You told us</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-full bg-lilac" />Alexa's guess, yours to keep or drop</span>
        <span className="inline-flex items-center gap-1.5"><i className="size-3 rounded-full bg-[#f2d23c]" />Hints, by voice or typed</span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {/* dates */}
        <Block title="Dates" icon={<CalendarHeart />} tone="peach" editing={editing === "dates"} onToggleEdit={toggle("dates")} flashing={isFlash("dates")}>
          {editing === "dates" ? (
            <DatesEditor person={p} onChange={set} />
          ) : p.dates.length ? (
            <Rows rows={p.dates.map((d) => {
              const n = nextOccurrence(d);
              return [d.type, `${formatDate(d)}${d.year ? `, turns ${n.date.getFullYear() - d.year}` : ""}`];
            })} />
          ) : <Empty>No dates yet</Empty>}
        </Block>

        {/* sizes */}
        <Block title="Sizes" icon={<Ruler />} tone="sky" editing={editing === "sizes"} onToggleEdit={toggle("sizes")} flashing={isFlash("sizes")}>
          {editing === "sizes" ? (
            <div className="grid gap-2">
              {(Object.keys(SIZE_LABELS) as SizeKey[]).map((k) => (
                <label key={k} className="grid grid-cols-[70px_1fr] items-center gap-2 text-sm text-muted">
                  {SIZE_LABELS[k]}
                  <input className="field py-1" value={p.sizes[k] ?? ""} placeholder="e.g. M (US) / 38 (EU)"
                    onChange={(e) => set((x) => ({ ...x, sizes: { ...x.sizes, [k]: e.target.value } }))} />
                </label>
              ))}
            </div>
          ) : Object.values(p.sizes).some(Boolean) ? (
            <Rows rows={(Object.keys(SIZE_LABELS) as SizeKey[]).filter((k) => p.sizes[k]).map((k) => [SIZE_LABELS[k], p.sizes[k]!])} />
          ) : <Empty>No sizes yet. Say “Alexa, {p.name} wears a medium”.</Empty>}
        </Block>

        {/* likes */}
        <Block title="Likes" icon={<Heart />} tone="mint" wide editing={editing === "likes"} onToggleEdit={toggle("likes")} flashing={isFlash("likes")}>
          {(Object.keys(LIKE_LABELS) as (keyof Likes)[])
            .filter((k) => editing === "likes" || p.likes[k].length)
            .map((k) => (
              <div key={k} className="flex flex-wrap items-center gap-2">
                <span className="w-16 shrink-0 text-xs text-muted">{LIKE_LABELS[k]}</span>
                <TagEditor label={LIKE_LABELS[k]} values={p.likes[k]} editing={editing === "likes"}
                  onChange={(v) => set((x) => ({ ...x, likes: { ...x.likes, [k]: v } }))} />
              </div>
            ))}
          {editing !== "likes" && !Object.values(p.likes).some((v) => v.length) && <Empty>Nothing yet</Empty>}
        </Block>

        {/* dislikes */}
        <Block title="Doesn't like" icon={<Ban />} tone="dove" editing={editing === "dislikes"} onToggleEdit={toggle("dislikes")} flashing={isFlash("dislikes")}>
          {p.dislikes.length || editing === "dislikes" ? (
            <TagEditor label="Doesn't like" negative values={p.dislikes} editing={editing === "dislikes"} onChange={(v) => set((x) => ({ ...x, dislikes: v }))} />
          ) : <Empty>Nothing yet</Empty>}
        </Block>

        {/* allergies */}
        <Block title="Allergies" icon={<Leaf />} tone="lemon" editing={editing === "allergies"} onToggleEdit={toggle("allergies")} flashing={isFlash("allergies")}>
          {p.allergies.length || editing === "allergies" ? (
            <TagEditor label="Allergies" values={p.allergies} editing={editing === "allergies"} onChange={(v) => set((x) => ({ ...x, allergies: v }))} />
          ) : <Empty>None known</Empty>}
        </Block>

        {/* hints */}
        <Block title="Hints" icon={<NotebookPen />} tone="paper" wide editing={editing === "hints"} onToggleEdit={toggle("hints")} flashing={isFlash("hints")}>
          {p.hints.length ? (
            <div className="flex flex-wrap gap-3.5">
              {p.hints.map((h, i) => (
                <div key={h.id} className={`sticky-note relative w-52 max-w-full rounded-[4px_4px_16px_4px] px-3.5 pb-2 pt-2.5 ${i % 2 ? "bg-pink-soft text-[#8a2c58]" : "bg-lemon text-lemon-ink"}`}>
                  <p className="mb-1.5 font-hand text-[22px] font-bold leading-[1.12]">{h.text}</p>
                  <small className="flex items-center gap-1 text-[11px] opacity-80">
                    {h.via === "voice" ? <Mic className="size-3" /> : <Keyboard className="size-3" />}
                    {h.date} · {h.via === "voice" ? "told Alexa" : "typed on the web"}
                  </small>
                  {editing === "hints" && (
                    <button type="button" aria-label="Delete hint" className="absolute right-1 top-1 rounded p-0.5 hover:bg-card/60"
                      onClick={() => set((x) => ({ ...x, hints: x.hints.filter((y) => y.id !== h.id) }))}>
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : <Empty>No hints yet. Say “Alexa, note that {p.name} loved…”</Empty>}
          <AddLine placeholder={`Add a hint about ${p.name}`} onAdd={(text) => set((x) => ({ ...x, hints: [{ id: newId(), text, date: todayIso(), via: "web" }, ...x.hints] }))} />
        </Block>

        {/* guesses */}
        <Block title="What Alexa thinks" icon={<Sparkles />} tone="lilac" wide flashing={isFlash("guesses")}>
          {p.guesses.length ? p.guesses.map((g) => (
            <div key={g.id} className={`grid gap-1 rounded-2xl border-2 border-lilac bg-card px-3.5 py-2.5 ${g.kept ? "" : "border-dashed"}`}>
              <b className="font-bold text-lilac">{g.text}</b>
              <span className="text-[13px] text-muted">Because: {g.why}</span>
              <div className="mt-1 flex gap-1.5">
                {!g.kept && (
                  <button type="button" className="btn bg-lilac-soft px-2.5 py-1 text-xs text-lilac"
                    onClick={() => set((x) => ({ ...x, guesses: x.guesses.map((y) => (y.id === g.id ? { ...y, kept: true } : y)) }))}>Keep</button>
                )}
                <button type="button" className="btn bg-dove px-2.5 py-1 text-xs text-muted"
                  onClick={() => set((x) => ({ ...x, guesses: x.guesses.filter((y) => y.id !== g.id) }))}>{g.kept ? "Remove" : "Drop"}</button>
              </div>
            </div>
          )) : <Empty>Alexa will suggest traits once she knows a little more.</Empty>}
        </Block>

        {/* gifts */}
        <Block title="Gift history" icon={<Gift />} tone="pink" wide editing={editing === "gifts"} onToggleEdit={toggle("gifts")} flashing={isFlash("gifts")}>
          {p.gifts.length ? (
            <div className="grid gap-2">
              {p.gifts.map((g) => (
                <div key={g.id} className="grid grid-cols-[38px_minmax(0,1fr)_auto] items-center gap-3 rounded-[14px] bg-card px-3 py-2">
                  <div className="grid size-[38px] place-items-center rounded-xl bg-pink-soft text-pink"><NamedIcon name={g.icon} className="size-[19px]" /></div>
                  <div className="min-w-0">
                    <div className="font-bold">{g.title}</div>
                    <div className="text-xs text-muted">{g.occasion}</div>
                  </div>
                  {editing === "gifts" ? (
                    <div className="flex flex-wrap items-center justify-end gap-1.5">
                      <select className="field w-auto py-1 text-xs" value={g.status} aria-label="Status"
                        onChange={(e) => set((x) => ({ ...x, gifts: x.gifts.map((y) => (y.id === g.id ? { ...y, status: e.target.value as GiftStatus } : y)) }))}>
                        {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <select className="field w-auto py-1 text-xs" value={g.reaction ?? ""} aria-label="Reaction"
                        onChange={(e) => set((x) => ({ ...x, gifts: x.gifts.map((y) => (y.id === g.id ? { ...y, reaction: (e.target.value || null) as Reaction | null } : y)) }))}>
                        <option value="">No reaction yet</option>
                        {Object.entries(REACTION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                      </select>
                      <button type="button" aria-label={`Delete ${g.title}`} className="rounded p-1 text-muted hover:bg-dove"
                        onClick={() => set((x) => ({ ...x, gifts: x.gifts.filter((y) => y.id !== g.id) }))}><Trash2 className="size-4" /></button>
                    </div>
                  ) : (
                    <GiftBadge status={g.status} reaction={g.reaction} />
                  )}
                </div>
              ))}
            </div>
          ) : <Empty>No gifts yet</Empty>}
          {editing === "gifts" && (
            <AddLine placeholder="Add a gift idea" onAdd={(title) => set((x) => ({ ...x, gifts: [{ id: newId(), icon: "gift", title, occasion: "Idea", status: "idea", reaction: null }, ...x.gifts] }))} />
          )}
        </Block>
      </div>
    </article>
  );
}

function GiftBadge({ status, reaction }: { status: GiftStatus; reaction: Reaction | null }) {
  if (reaction) {
    const tone = reaction === "loved" || reaction === "liked" ? "bg-mint-soft text-mint" : "bg-dove text-muted";
    return <span className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold ${tone}`}>{REACTION_LABELS[reaction]}</span>;
  }
  const tone = status === "idea" ? "bg-lemon text-lemon-ink" : "bg-sky-soft text-sky";
  const label = status === "bought" ? "Bought, not given yet" : STATUS_LABELS[status];
  return <span className={`whitespace-nowrap rounded-md px-2.5 py-1 text-xs font-bold ${tone}`}>{label}</span>;
}

function Rows({ rows }: { rows: [string, string][] }) {
  return (
    <div className="grid gap-0.5">
      {rows.map(([k, v], i) => (
        <div key={i} className="flex justify-between gap-3 border-b-2 border-dotted border-ink/10 py-1.5 tabular-nums">
          <span className="text-muted">{k}</span>
          <span className="text-right font-semibold">{v}</span>
        </div>
      ))}
    </div>
  );
}

function AddLine({ placeholder, onAdd }: { placeholder: string; onAdd: (text: string) => void }) {
  const [v, setV] = useState("");
  const submit = () => { if (v.trim()) { onAdd(v.trim()); setV(""); } };
  return (
    <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); submit(); }}>
      <input className="field py-1.5 text-sm" value={v} placeholder={placeholder} aria-label={placeholder} onChange={(e) => setV(e.target.value)} />
      <button type="submit" className="btn bg-card text-ink hover:bg-dove"><Plus className="size-4" />Add</button>
    </form>
  );
}

function HeadEditor({ person: p, onChange, onDone, onDelete }: {
  person: Person; onChange: (fn: (p: Person) => Person) => void; onDone: () => void; onDelete: () => void;
}) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  return (
    <div className="grid flex-1 gap-2 sm:grid-cols-2">
      <label className="grid gap-1 text-xs text-muted">Name
        <input className="field" value={p.name} onChange={(e) => onChange((x) => ({ ...x, name: e.target.value }))} />
      </label>
      <label className="grid gap-1 text-xs text-muted">Relationship
        <input className="field" value={p.relationship} placeholder="Partner, Mother, Friend…" onChange={(e) => onChange((x) => ({ ...x, relationship: e.target.value }))} />
      </label>
      <label className="grid gap-1 text-xs text-muted">What you call them when talking to Alexa
        <input className="field" value={p.voiceAlias} placeholder="my girlfriend" onChange={(e) => onChange((x) => ({ ...x, voiceAlias: e.target.value }))} />
      </label>
      <label className="grid gap-1 text-xs text-muted">Pronoun
        <select className="field" value={p.pronoun} onChange={(e) => onChange((x) => ({ ...x, pronoun: e.target.value as Pronoun }))}>
          <option value="her">she / her</option><option value="him">he / him</option><option value="them">they / them</option>
        </select>
      </label>
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <button type="button" className="btn bg-mint-soft text-mint" onClick={onDone}>Done</button>
        {confirmDelete ? (
          <>
            <span className="self-center text-sm text-muted">Delete {p.name} and everything about them?</span>
            <button type="button" className="btn bg-pink text-white" onClick={onDelete}>Yes, delete</button>
            <button type="button" className="btn bg-dove text-muted" onClick={() => setConfirmDelete(false)}>Keep</button>
          </>
        ) : (
          <button type="button" className="btn bg-dove text-muted" onClick={() => setConfirmDelete(true)}><Trash2 className="size-3.5" />Delete person</button>
        )}
      </div>
    </div>
  );
}

function DatesEditor({ person: p, onChange }: { person: Person; onChange: (fn: (p: Person) => Person) => void }) {
  const patch = (id: string, change: Partial<Person["dates"][number]>) =>
    onChange((x) => ({ ...x, dates: x.dates.map((d) => (d.id === id ? { ...d, ...change } : d)) }));
  return (
    <div className="grid gap-2">
      {p.dates.map((d) => (
        <div key={d.id} className="flex flex-wrap items-center gap-1.5">
          <input className="field w-28 py-1 text-sm" value={d.type} aria-label="Occasion" onChange={(e) => patch(d.id, { type: e.target.value })} />
          <select className="field w-auto py-1 text-sm" value={d.month} aria-label="Month" onChange={(e) => patch(d.id, { month: Number(e.target.value) })}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <input className="field w-14 py-1 text-sm" type="number" min={1} max={31} value={d.day} aria-label="Day" onChange={(e) => patch(d.id, { day: Number(e.target.value) })} />
          <input className="field w-20 py-1 text-sm" type="number" placeholder="Year" value={d.year ?? ""} aria-label="Year (optional)"
            onChange={(e) => patch(d.id, { year: e.target.value ? Number(e.target.value) : null })} />
          <button type="button" aria-label={`Delete ${d.type}`} className="rounded p-1 text-muted hover:bg-card"
            onClick={() => onChange((x) => ({ ...x, dates: x.dates.filter((y) => y.id !== d.id) }))}><Trash2 className="size-4" /></button>
        </div>
      ))}
      <button type="button" className="btn w-fit bg-card text-peach-ink"
        onClick={() => onChange((x) => ({ ...x, dates: [...x.dates, { id: newId(), type: "Birthday", month: 0, day: 1, year: null }] }))}>
        <Plus className="size-4" />Add a date
      </button>
    </div>
  );
}
