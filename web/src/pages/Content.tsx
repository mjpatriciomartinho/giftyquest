import type { ReactNode } from "react";
import { Link } from "react-router";

export function ContentPage({ title, draft, updated, lead, children }: {
  title: string; draft?: boolean; updated?: string; lead?: string; children: ReactNode;
}) {
  return (
    <article className="grid gap-3.5 rounded-3xl bg-card px-[clamp(18px,5vw,56px)] py-[clamp(24px,4vw,44px)] [&>*]:max-w-[70ch] [&_li]:leading-relaxed [&_p]:leading-relaxed">
      <h1 className="font-display text-[clamp(28px,4vw,40px)] font-semibold leading-tight">
        {title}
        {draft && <span className="ml-2 inline-block rounded-md bg-lemon px-2 py-0.5 align-middle font-body text-[11px] font-bold text-lemon-ink">Draft</span>}
      </h1>
      {updated && <p className="text-[13px] text-muted">Last updated {updated}.</p>}
      {lead && <p className="text-[17px] text-muted">{lead}</p>}
      {children}
    </article>
  );
}

export function H2({ children, id }: { children: ReactNode; id?: string }) {
  return <h2 id={id} className="mt-3.5 scroll-mt-4 font-display text-xl font-semibold">{children}</h2>;
}

export function NotFound() {
  return (
    <ContentPage title="We couldn't find that page" lead="The link may be old, or the page moved.">
      <p><Link to="/" className="font-bold text-pink">Go to the homepage</Link></p>
    </ContentPage>
  );
}
