import type { CSSProperties, ReactNode } from "react";
import { Check, Pencil } from "../lib/icons";

export type Tone = "peach" | "sky" | "mint" | "dove" | "lemon" | "lilac" | "pink" | "paper";

const TONES: Record<Tone, { bg: string; ink: string }> = {
  peach: { bg: "var(--color-peach-soft)", ink: "var(--color-peach-ink)" },
  sky: { bg: "var(--color-sky-soft)", ink: "var(--color-sky)" },
  mint: { bg: "var(--color-mint-soft)", ink: "var(--color-mint)" },
  dove: { bg: "var(--color-dove)", ink: "var(--color-muted)" },
  lemon: { bg: "var(--color-lemon-soft)", ink: "var(--color-lemon-ink)" },
  lilac: { bg: "var(--color-lilac-soft)", ink: "var(--color-lilac)" },
  pink: { bg: "var(--color-pink-soft)", ink: "var(--color-pink)" },
  paper: { bg: "var(--color-paper)", ink: "var(--color-lilac)" },
};

interface Props {
  title: string;
  icon: ReactNode;
  tone: Tone;
  wide?: boolean;
  flashing?: boolean;
  editing?: boolean;
  onToggleEdit?: () => void;
  children: ReactNode;
}

export function Block({ title, icon, tone, wide, flashing, editing, onToggleEdit, children }: Props) {
  const t = TONES[tone];
  const style = { background: t.bg, "--tag-color": t.ink, "--block-bg": t.bg } as CSSProperties;
  return (
    <section
      style={style}
      className={`grid min-w-0 content-start gap-2.5 rounded-[18px] px-4 py-3.5 ${wide ? "sm:col-span-2" : ""} ${flashing ? "flash" : ""}`}
    >
      <div className="flex items-center gap-1.5 font-display text-[13px] font-semibold uppercase tracking-[0.04em]" style={{ color: t.ink }}>
        <span className="[&>svg]:size-4">{icon}</span>
        {title}
        {onToggleEdit && (
          <button
            type="button"
            onClick={onToggleEdit}
            className="btn ml-auto bg-card/70 px-2 py-1 text-xs normal-case tracking-normal hover:bg-card"
            style={{ color: t.ink }}
            aria-label={editing ? `Done editing ${title}` : `Edit ${title}`}
          >
            {editing ? <><Check className="size-3.5" />Done</> : <><Pencil className="size-3.5" />Edit</>}
          </button>
        )}
      </div>
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="text-[13px] italic text-muted">{children}</p>;
}
