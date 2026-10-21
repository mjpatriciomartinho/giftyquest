import { AlexaPanel } from "../components/AlexaPanel";
import { PersonCard } from "../components/PersonCard";
import { useScriptedAlexa } from "../alexa/useScriptedAlexa";
import { useLiveAlexa } from "../alexa/useLiveAlexa";
import { useStore } from "../lib/store";
import { useEffect, useState } from "react";
import { mcpUrl } from "../lib/api";
import { Check, Plus, UserPlus } from "../lib/icons";

const AVATAR_TONES = ["bg-pink-soft text-pink", "bg-mint-soft text-mint", "bg-sky-soft text-sky", "bg-peach-soft text-peach-ink", "bg-lilac-soft text-lilac"];

export function MyPeople() {
  const { ready, error, ensureOpen } = useStore();
  useEffect(ensureOpen, [ensureOpen]);
  if (error) return (
    <div className="grid justify-items-start gap-3 rounded-3xl bg-card p-8">
      <b className="font-display text-xl font-semibold">We couldn't open your demo account</b>
      <span className="text-muted">{error}</span>
      <button type="button" className="btn bg-pink text-white" onClick={() => location.reload()}>Try again</button>
    </div>
  );
  if (!ready) return <div className="rounded-3xl bg-card p-8 text-muted">Opening your demo account…</div>;
  return <PeopleWorkspace />;
}

function PeopleWorkspace() {
  const { people, currentId, select, addPerson, accountId } = useStore();
  const scripted = useScriptedAlexa();
  const liveAlexa = useLiveAlexa();
  const isLive = liveAlexa.status.available;
  const alexa = isLive ? liveAlexa : scripted;

  return (
    <div className="grid gap-4">
      <nav aria-label="People" className="flex flex-wrap gap-2">
        {people.map((p, i) => (
          <button key={p.id} type="button" onClick={() => select(p.id)} aria-pressed={p.id === currentId}
            className={`flex items-center gap-2 rounded-full border-2 bg-card py-1 pl-1 pr-3.5 text-sm font-semibold ${p.id === currentId ? "border-pink" : "border-transparent"}`}>
            <span className={`grid size-7 place-items-center rounded-full font-display text-sm font-semibold ${AVATAR_TONES[i % AVATAR_TONES.length]}`}>{p.name[0] ?? "?"}</span>
            {p.name}
          </button>
        ))}
        <button type="button" onClick={alexa.startInterview} className="btn rounded-full bg-lilac-soft px-3.5 py-2 text-sm text-lilac">
          <UserPlus className="size-4" />New person, by voice
        </button>
        <button type="button" onClick={addPerson} className="btn rounded-full bg-card px-3.5 py-2 text-sm text-muted">
          <Plus className="size-4" />Add by hand
        </button>
      </nav>
      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        {people.length ? <PersonCard onExplore={alexa.explore} /> : (
          <div className="rounded-3xl bg-card p-8 text-muted">No people yet. Add someone by voice or by hand.</div>
        )}
        <div className="grid min-w-0 gap-4 lg:sticky lg:top-3">
          <AlexaPanel msgs={alexa.msgs} quick={alexa.quick} busy={alexa.busy} onSend={alexa.send} onRestart={alexa.restart}
            mode={isLive ? { kind: "live", model: liveAlexa.status.model } : { kind: "script", needsCode: liveAlexa.status.needsCode }}
            onUnlock={liveAlexa.unlock} />
          <ConnectCard url={mcpUrl(accountId)} />
        </div>
      </div>
    </div>
  );
}

// Shows the MCP address of this demo account so any MCP client (Claude, and Alexa+ later) can connect.
function ConnectCard({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => navigator.clipboard?.writeText(url).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  return (
    <div className="grid min-w-0 gap-2 rounded-3xl bg-card p-4 text-sm [&>*]:min-w-0">
      <b className="font-display text-base font-semibold">Connect your own assistant</b>
      <p className="text-muted">This demo account has its own MCP server. Add this address to any MCP client to use the same cards.</p>
      <div className="flex min-w-0 gap-1.5">
        <code className="min-w-0 flex-1 select-all overflow-x-auto whitespace-nowrap rounded-lg bg-paper px-2.5 py-1.5 text-xs">{url}</code>
        <button type="button" onClick={copy} className="btn bg-lilac-soft text-lilac">{copied ? <><Check className="size-3.5" />Copied</> : "Copy"}</button>
      </div>
      <p className="text-xs text-muted">Demo accounts and their data are deleted after 24 hours.</p>
    </div>
  );
}
