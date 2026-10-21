import { useEffect, useState } from "react";
import { TRENDING, TRENDING_FILTERS, amazonSearch, fitFor } from "../alexa/catalog";
import { newId } from "../lib/id";
import { useStore } from "../lib/store";
import { Bookmark, Check, ExternalLink, NamedIcon } from "../lib/icons";

const TONES = ["bg-pink-soft text-pink", "bg-mint-soft text-mint", "bg-sky-soft text-sky", "bg-peach-soft text-peach-ink", "bg-lilac-soft text-lilac"];

export function Trending() {
  const { people, update, ensureOpen } = useStore();
  useEffect(ensureOpen, [ensureOpen]);
  const [filter, setFilter] = useState("all");
  const items = TRENDING.filter((i) => filter === "all" || i.cats.includes(filter));

  return (
    <div className="grid gap-4">
      <div>
        <h1 className="font-display text-3xl font-semibold">Trending gifts</h1>
        <p className="text-muted">Popular picks this season. We flag the ones that fit your people.</p>
      </div>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter">
        {TRENDING_FILTERS.map(([k, label]) => (
          <button key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
            className={`btn border-2 px-3 py-1.5 ${filter === k ? "border-ink bg-ink text-white" : "border-line bg-card text-ink"}`}>{label}</button>
        ))}
      </div>
      <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(250px,1fr))]">
        {items.map((item, n) => {
          const fit = fitFor(item, people);
          const saved = fit?.person.gifts.some((g) => g.title === item.title);
          return (
            <div key={item.title} className="grid content-start gap-2 rounded-[20px] bg-card p-4">
              <div className="flex items-center gap-3">
                <div className={`grid size-[52px] shrink-0 place-items-center rounded-[14px] ${TONES[n % TONES.length]}`}><NamedIcon name={item.icon} className="size-[26px]" /></div>
                <div><h2 className="font-bold leading-tight">{item.title}</h2><span className="font-bold tabular-nums text-pink">${item.price}</span></div>
              </div>
              <p className="text-[13.5px] text-muted">{item.note}</p>
              {fit && (
                <div className="rounded-xl bg-lemon-soft px-2.5 py-2 text-[13px]">
                  <b className="text-lemon-ink">Fits {fit.person.name}</b> because of “{fit.because}”
                </div>
              )}
              <div className="flex flex-wrap gap-1.5">
                {fit && (
                  <button type="button" disabled={saved} className="btn bg-pink text-white"
                    onClick={() => update(fit.person.id, (p) => ({ ...p, gifts: [{ id: newId(), icon: item.icon, title: item.title, occasion: "Saved from Trending", status: "idea", reaction: null, priceUsd: item.price }, ...p.gifts] }))}>
                    {saved ? <><Check className="size-3.5" />Saved</> : <><Bookmark className="size-3.5" />Save for {fit.person.name}</>}
                  </button>
                )}
                <a className="btn bg-lilac-soft text-lilac" href={amazonSearch(item.title)} target="_blank" rel="noopener noreferrer"><ExternalLink className="size-3.5" />Find on Amazon</a>
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted">Example picks for the prototype. Live trend data is planned for a later version.</p>
    </div>
  );
}
