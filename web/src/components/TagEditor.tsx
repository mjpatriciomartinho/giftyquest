import { useState } from "react";
import { Ban, X } from "../lib/icons";

interface Props {
  values: string[];
  onChange: (values: string[]) => void;
  editing: boolean;
  label: string;
  negative?: boolean; // dislikes: struck through with a ban icon
  placeholder?: string;
}

export function TagEditor({ values, onChange, editing, label, negative, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const v = draft.trim();
    if (v && !values.some((x) => x.toLowerCase() === v.toLowerCase())) onChange([...values, v]);
    setDraft("");
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {values.map((v) => (
        <span key={v} className={`gift-tag ${negative ? "text-muted line-through decoration-muted/50" : ""}`}>
          {negative && <Ban className="size-3.5" aria-hidden />}
          {v}
          {editing && (
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Remove ${v}`} className="-mr-1 rounded p-0.5 hover:bg-dove">
              <X className="size-3" />
            </button>
          )}
        </span>
      ))}
      {editing && (
        <input
          className="field w-40 py-1 text-[13px]"
          value={draft}
          placeholder={placeholder ?? "Add and press Enter"}
          aria-label={`Add to ${label}`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          onBlur={add}
        />
      )}
    </div>
  );
}
