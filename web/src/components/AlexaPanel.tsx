import { useEffect, useRef, useState } from "react";
import { amazonSearch } from "../alexa/catalog";
import type { Msg } from "../alexa/useScriptedAlexa";
import { CircleCheck, ExternalLink, NamedIcon, RotateCcw, Send, ShoppingCart } from "../lib/icons";

interface Props {
  msgs: Msg[];
  quick: string[];
  busy: boolean;
  onSend: (text: string) => void;
  onRestart: () => void;
  mode: { kind: "live"; model: string } | { kind: "script"; needsCode: boolean };
  onUnlock: (code: string) => void;
}

const MODEL_NAMES: Record<string, string> = { "eu.amazon.nova-2-lite-v1:0": "Amazon Nova 2 Lite" };

const IDEA_TONES = ["bg-peach-soft text-peach-ink", "bg-mint-soft text-mint", "bg-lilac-soft text-lilac"];

export function AlexaPanel({ msgs, quick, busy, onSend, onRestart, mode, onUnlock }: Props) {
  const [draft, setDraft] = useState("");
  const [code, setCode] = useState("");
  const logRef = useRef<HTMLDivElement>(null);
  useEffect(() => { logRef.current?.scrollTo({ top: 1e9 }); }, [msgs, busy]);

  return (
    <aside aria-label="Alexa+ conversation (simulated)"
      className="flex h-[640px] min-h-[520px] flex-col overflow-hidden rounded-3xl bg-card lg:h-[min(700px,calc(100vh-260px))]">
      <div className="flex items-center gap-2.5 bg-sky-soft px-4 py-3.5">
        <div className={`size-7 shrink-0 rounded-full border-4 border-sky bg-card ${busy ? "animate-pulse" : ""}`} />
        <div>
          <b className="font-display text-[17px] font-semibold">Alexa+</b>
          <small className="block text-[11.5px] leading-tight text-muted">
            {mode.kind === "live"
              ? `Live: ${MODEL_NAMES[mode.model] ?? mode.model} on Amazon Bedrock, using the GiftyQuest MCP tools shown under each reply.`
              : "Demo script. Replies follow a fixed script that uses the same MCP tool names."}
          </small>
        </div>
        <button type="button" onClick={onRestart} className="btn ml-auto bg-card text-sky"><RotateCcw className="size-3.5" />Restart</button>
      </div>

      <div ref={logRef} className="flex flex-1 flex-col gap-2.5 overflow-y-auto p-3.5">
        {msgs.map((m) => <Message key={m.id} m={m} onSend={onSend} />)}
        {busy && <div className="self-start px-2 py-1 text-[13px] text-muted">Alexa is thinking…</div>}
      </div>

      {mode.kind === "script" && mode.needsCode && (
        <form className="mx-3.5 mb-2.5 flex gap-1.5 rounded-xl bg-lilac-soft p-2" onSubmit={(e) => { e.preventDefault(); onUnlock(code); }}>
          <input className="field min-w-0 flex-1 py-1 text-sm" value={code} onChange={(e) => setCode(e.target.value)} placeholder="Judge code" aria-label="Judge code" />
          <button type="submit" className="btn bg-lilac text-white">Unlock live Alexa</button>
        </form>
      )}

      {quick.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3.5 pb-2.5">
          {quick.map((q) => (
            <button key={q} type="button" onClick={() => onSend(q)}
              className="rounded-[10px] border-2 border-sky-soft bg-card px-3 py-1 text-[12.5px] font-bold text-sky hover:bg-sky-soft">{q}</button>
          ))}
        </div>
      )}

      <form className="flex gap-1.5 border-t-2 border-line px-3.5 py-3"
        onSubmit={(e) => { e.preventDefault(); onSend(draft); setDraft(""); }}>
        <input className="field min-w-0 flex-1 bg-paper" value={draft} onChange={(e) => setDraft(e.target.value)}
          placeholder="Talk to Alexa…" aria-label="Message to Alexa" />
        <button type="submit" aria-label="Send" className="grid size-[42px] shrink-0 place-items-center rounded-xl bg-sky text-white"><Send className="size-4" /></button>
      </form>
    </aside>
  );
}

function Message({ m, onSend }: { m: Msg; onSend: (t: string) => void }) {
  if (m.kind === "user" || m.kind === "bot") {
    const user = m.kind === "user";
    return (
      <div className={`max-w-[88%] rounded-2xl px-3.5 py-2 ${user ? "self-end rounded-br-md bg-pink-soft" : "self-start rounded-bl-md bg-sky-soft"}`}>
        {m.text}
        {m.tools && m.tools.length > 0 && (
          <div className="mt-1.5 flex flex-wrap gap-1">
            {m.tools.map((t) => <span key={t} className="rounded-md bg-card/70 px-1.5 font-mono text-[11px] text-sky">{t}</span>)}
          </div>
        )}
      </div>
    );
  }
  if (m.kind === "ideas") {
    return (
      <div className="grid gap-2.5">
        {m.ideas.map((i, n) => (
          <div key={i.title} className="grid grid-cols-[46px_minmax(0,1fr)] gap-3 rounded-2xl bg-paper p-3">
            <div className={`grid size-[46px] place-items-center rounded-xl ${IDEA_TONES[n % 3]}`}><NamedIcon name={i.icon} className="size-6" /></div>
            <div className="min-w-0">
              <h4 className="font-bold leading-tight">{i.title}{!i.product?.price && <> · <span className="tabular-nums text-pink">${i.price}</span></>}</h4>
              <p className="mb-2 mt-0.5 text-[12.5px] text-muted">Why: {i.why}</p>
              {i.basedOn && i.basedOn.length > 0 && (
                <div className="mb-2 flex flex-wrap gap-1" aria-label="Combines" style={{ ["--tag-color" as string]: "var(--color-lilac)", ["--block-bg" as string]: "var(--color-paper)" }}>
                  {i.basedOn.map((b) => <span key={b} className="gift-tag py-0.5 text-[11.5px]">{b}</span>)}
                </div>
              )}
              {i.product && (
                <a href={i.product.url} target="_blank" rel="noopener noreferrer sponsored"
                  className="mb-2 grid grid-cols-[56px_minmax(0,1fr)] items-center gap-2.5 rounded-xl bg-card p-2 text-ink no-underline hover:bg-dove">
                  {i.product.imageUrl
                    ? <img src={i.product.imageUrl} alt="" className="size-14 rounded-lg object-contain" />
                    : <span className="grid size-14 place-items-center rounded-lg bg-dove"><NamedIcon name={i.icon} className="size-6" /></span>}
                  <span className="min-w-0">
                    <span className="block text-[11px] font-bold uppercase tracking-wide text-muted">On Amazon</span>
                    <span className="line-clamp-2 text-[12.5px] leading-snug">{i.product.title}</span>
                    {i.product.price && <span className="block font-bold tabular-nums text-pink">{i.product.price}</span>}
                  </span>
                </a>
              )}
              <div className="flex flex-wrap gap-1.5">
                <button type="button" className="btn bg-pink text-white" onClick={() => onSend(`Buy the ${i.title.toLowerCase()}`)}><ShoppingCart className="size-3.5" />Buy</button>
                <a className="btn bg-lilac-soft text-lilac" href={i.product?.url ?? i.searchUrl ?? amazonSearch(i.query)} target="_blank" rel="noopener noreferrer sponsored">
                  <ExternalLink className="size-3.5" />{i.product ? "View on Amazon" : "Find on Amazon"}
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }
  if (m.kind === "checkout") {
    return (
      <div className="grid gap-1.5 rounded-2xl bg-peach-soft p-3.5">
        <span className="text-[11.5px] text-muted">Checkout (simulated, no real payment)</span>
        <b>{m.idea.title}</b>
        <span className="font-display text-[26px] font-semibold text-peach-ink">${m.idea.price}.00</span>
        <span className="text-[11.5px] text-muted">Arrives in 2 to 3 days · ships to your saved address</span>
        <div className="flex gap-1.5">
          <button type="button" className="btn bg-pink text-white" onClick={() => onSend("Yes, order it")}>Order it</button>
          <button type="button" className="btn bg-card text-muted" onClick={() => onSend("Cancel")}>Cancel</button>
        </div>
      </div>
    );
  }
  if (m.kind !== "receipt") return null;
  return (
    <div className="grid gap-1 rounded-2xl bg-mint-soft p-3.5">
      <b className="flex items-center gap-1.5 text-mint"><CircleCheck className="size-4" />Order placed</b>
      <span>{m.idea.title} · ${m.idea.price}.00</span>
      <span className="text-[11.5px] text-muted">Order {m.order} · simulated</span>
    </div>
  );
}
