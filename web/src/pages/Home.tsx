import { Link } from "react-router";
import {
  ArrowRight, Ban, CalendarHeart, CircleCheck, Dumbbell, Gift, Heart, Lock, Mic, NotebookPen, RefreshCcw, ShoppingCart, Sparkles,
} from "lucide-react";

const PAINS = [
  ["Another candle?", "You know them well, but when the date comes, your mind goes blank."],
  ["They already have everything.", "The obvious ideas are taken. You need one they'd never expect."],
  ["Top 10 gifts for him.", "Gift guides are written for everyone, so they fit no one in particular."],
];

const FEATURES = [
  { icon: Mic, title: "A two-minute voice interview", text: "Alexa asks about their favorite artists, food, hobbies and what they can't stand, and follows up on your answers.", tone: "bg-pink-soft text-pink" },
  { icon: NotebookPen, title: "Hints with a date", text: "“Alexa, note that Javier loved that lamp.” Every hint keeps when you heard it and how you saved it.", tone: "bg-lemon-soft text-lemon-ink" },
  { icon: Sparkles, title: "Ideas you wouldn't have thought of", text: "Alexa mixes what you saved, a hobby, a color, a passing hint, into new ideas, and tells you what it combined. It asks your budget each time.", tone: "bg-lilac-soft text-lilac" },
  { icon: ShoppingCart, title: "Buy in the conversation", text: "Pick an idea, say yes, done. Nothing is ordered without your clear yes.", tone: "bg-peach-soft text-peach-ink" },
  { icon: RefreshCcw, title: "It learns every year", text: "Tell Alexa how the gift went. Loved, liked or not quite: next time the ideas get better.", tone: "bg-mint-soft text-mint" },
  { icon: Lock, title: "Secret by design", text: "On a shared Echo, Alexa only talks about a gift with the person planning it.", tone: "bg-sky-soft text-sky" },
];

const FAQ = [
  ["Do I need an Echo?", "No. You can use GiftyQuest on the web today. Alexa+ connects through MCP, an open standard, and so can other assistants such as Claude."],
  ["Does it buy things for real?", "Not in this prototype. Checkout is simulated and no payment details are collected. “Find on Amazon” opens a normal Amazon search."],
  ["What happens to the information I save?", "It stays in your account and is never sold or used for ads. Demo accounts are deleted automatically after 24 hours."],
  ["Is it free?", "The prototype is free and open source under the MIT license."],
];

export function Home() {
  return (
    <div className="grid gap-20 pb-6 sm:gap-24">
      {/* hero */}
      <section className="grid items-center gap-10 pt-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)] lg:pt-10">
        <div className="grid content-start gap-6">
          <h1 className="font-display text-[clamp(40px,6vw,68px)] font-semibold leading-[1.02] tracking-[-0.01em]">
            Discover gifts they'll actually{" "}
            <span className="relative inline-block font-hand text-[1.18em] font-bold text-pink">
              love
              <svg viewBox="0 0 120 12" className="absolute -bottom-1 left-0 w-full" aria-hidden><path d="M2 8 C 30 2, 70 2, 118 7" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" /></svg>
            </span>.
          </h1>
          <p className="max-w-[52ch] text-lg text-muted">
            Keeping a gift list is easy. Knowing what to give is the hard part. Tell Alexa what makes each person tick, from their
            hobbies to a passing comment, and get fresh ideas you'd never have thought of, each with the reason it fits them.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link to="/app" className="btn rounded-xl bg-pink px-5 py-3 text-base text-white hover:bg-pink/90">
              Try the demo <ArrowRight className="size-4" />
            </Link>
            <Link to="/how-it-works" className="btn rounded-xl bg-card px-5 py-3 text-base text-ink hover:bg-dove">How it works</Link>
          </div>
          <p className="text-sm text-muted">No sign-up. You get a demo account with example people, deleted after 24 hours.</p>
        </div>
        <HeroScene />
      </section>

      {/* problem */}
      <section className="grid gap-6">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Sound familiar?</h2>
        <div className="grid gap-3 md:grid-cols-3">
          {PAINS.map(([quote, text]) => (
            <div key={quote} className="grid content-start gap-2 rounded-3xl bg-card p-6">
              <p className="font-hand text-[30px] font-bold leading-none text-pink">“{quote}”</p>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* how */}
      <section className="grid gap-6">
        <div className="grid gap-2">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">From a passing comment to the right gift</h2>
          <p className="max-w-[60ch] text-muted">Four steps, mostly by voice. Everything also lives on the web, where you can see and edit it.</p>
        </div>
        <ol className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {[
            ["Tell Alexa about them", "A short interview builds their card.", "bg-pink-soft"],
            ["Drop hints anytime", "Heard something? Say it. It lands on their card.", "bg-mint-soft"],
            ["Ask for ideas", "Alexa mixes what it knows into new ideas, within your budget.", "bg-sky-soft"],
            ["Say how it went", "Their reaction makes next year's ideas better.", "bg-lemon-soft"],
          ].map(([t, d, bg], i) => (
            <li key={t} className={`grid content-start gap-1.5 rounded-3xl p-5 ${bg}`}>
              <span className="font-display text-sm font-semibold text-muted">Step {i + 1}</span>
              <b className="font-display text-xl font-semibold leading-tight">{t}</b>
              <span className="text-muted">{d}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* features */}
      <section className="grid gap-6">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Made for people who love giving</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, text, tone }) => (
            <div key={title} className="grid content-start gap-3 rounded-3xl bg-card p-6">
              <span className={`grid size-12 place-items-center rounded-2xl ${tone}`}><Icon className="size-6" /></span>
              <b className="font-display text-xl font-semibold leading-tight">{title}</b>
              <p className="text-muted">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* open standards */}
      <section className="grid gap-8 rounded-[32px] bg-lilac-soft p-6 sm:p-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-center">
        <div className="grid content-start gap-4">
          <h2 className="font-display text-3xl font-semibold sm:text-4xl">Your gift memory, open to the assistant you use</h2>
          <p className="text-muted">
            GiftyQuest exposes everything through an MCP server, the open standard assistants use to work with apps. Alexa+ reads your cards
            and helps you choose. So can Claude, or any MCP-compatible assistant, today.
          </p>
          <p className="text-muted">In this prototype, Alexa+ is simulated with Amazon Nova on Amazon Bedrock, connected to the same MCP server.</p>
        </div>
        <div className="grid gap-2.5">
          {[
            ["Alexa+", "Voice, cards and checkout in the conversation"],
            ["Amazon Nova on Bedrock", "Runs the interview and writes the reasons"],
            ["GiftyQuest MCP server", "13 tools and a guided interview prompt"],
            ["Your cards on the web", "See and edit everything"],
          ].map(([t, d], i) => (
            <div key={t} className="flex items-center gap-3 rounded-2xl bg-card px-4 py-3" style={{ marginLeft: `${i * 4}%` }}>
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-lilac-soft font-display font-semibold text-lilac">{i + 1}</span>
              <span className="min-w-0"><b className="block font-display font-semibold">{t}</b><span className="text-sm text-muted">{d}</span></span>
            </div>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="grid gap-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <h2 className="font-display text-3xl font-semibold sm:text-4xl">Questions</h2>
        <div className="grid gap-3">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group rounded-2xl bg-card px-5 py-4">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-display text-lg font-semibold">
                {q}<span className="text-2xl leading-none text-pink transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-2 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* final cta */}
      <section className="grid justify-items-center gap-5 rounded-[32px] bg-pink-soft px-6 py-12 text-center">
        <Gift className="size-10 text-pink" />
        <h2 className="max-w-[20ch] font-display text-3xl font-semibold sm:text-4xl">The next birthday is closer than you think</h2>
        <p className="max-w-[48ch] text-muted">Try GiftyQuest with Javier and Dani, our example people, or add someone of your own by voice.</p>
        <Link to="/app" className="btn rounded-xl bg-pink px-5 py-3 text-base text-white hover:bg-pink/90">Try the demo <ArrowRight className="size-4" /></Link>
      </section>
    </div>
  );
}

/** Illustration built from the real UI pieces: a card, a hint, Alexa and an idea. */
function HeroScene() {
  return (
    <div className="relative mx-auto grid w-full max-w-[520px] gap-3" aria-label="Example: Javier's card, a hint and an idea from Alexa">
      <div className="grid gap-4 rounded-[28px] bg-card p-5">
        <div className="flex items-center gap-3">
          <span className="grid size-12 place-items-center rounded-full bg-peach-soft font-display text-xl font-semibold text-peach-ink">J</span>
          <div className="min-w-0">
            <b className="block font-display text-2xl font-semibold leading-none">Javier</b>
            <span className="text-sm text-muted">Partner · “my partner”</span>
          </div>
          <span className="ml-auto flex items-center gap-1.5 rounded-xl bg-peach-soft px-3 py-1.5 text-xs font-bold text-peach-ink">
            <CalendarHeart className="size-3.5" />Anniversary in 25 days
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 rounded-2xl bg-mint-soft p-3" style={{ ["--tag-color" as string]: "var(--color-mint)", ["--block-bg" as string]: "var(--color-mint-soft)" }}>
          <span className="gift-tag"><Heart className="size-3" />Powerlifting</span>
          <span className="gift-tag">Age of Empires</span>
          <span className="gift-tag">The Offspring</span>
          <span className="gift-tag">Orange</span>
          <span className="gift-tag text-muted line-through decoration-muted/50"><Ban className="size-3" />Perfume</span>
        </div>
        <div className="sticky-note w-[230px] max-w-full rounded-[4px_4px_16px_4px] bg-lemon px-4 pb-2 pt-3 text-lemon-ink">
          <p className="font-hand text-[24px] font-bold leading-[1.1]">Loved the ceramic lamp at their sister's place</p>
          <small className="mt-1 flex items-center gap-1 text-[11px] opacity-80"><Mic className="size-3" />2026-03-12 · told Alexa</small>
        </div>
      </div>

      <div className="ml-auto max-w-[85%] rounded-2xl rounded-br-md bg-pink-soft px-4 py-2.5">Alexa, gift ideas for Javier, under $80?</div>
      <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-sky-soft px-4 py-2.5">
        Here are three ideas. I'd pick the orange leather lifting belt: it mixes their powerlifting, their favorite color and the handmade style of the lamp they loved in March.
      </div>
      <div className="grid grid-cols-[48px_minmax(0,1fr)] gap-3 rounded-2xl bg-card p-3.5">
        <span className="grid size-12 place-items-center rounded-xl bg-peach-soft text-peach-ink"><Dumbbell className="size-6" /></span>
        <div className="min-w-0">
          <b className="block leading-tight">Orange leather lifting belt, hand-stitched · <span className="text-pink">$69</span></b>
          <span className="text-[13px] text-muted">Why: a new idea built from three things you told Alexa</span>
          <div className="mt-1.5 flex flex-wrap gap-1" style={{ ["--tag-color" as string]: "var(--color-lilac)", ["--block-bg" as string]: "var(--color-card)" }}>
            <span className="gift-tag bg-lilac-soft py-0.5 text-[11.5px]">ceramic lamp hint</span>
            <span className="gift-tag bg-lilac-soft py-0.5 text-[11.5px]">powerlifting</span>
            <span className="gift-tag bg-lilac-soft py-0.5 text-[11.5px]">orange</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[13px] font-bold text-mint"><CircleCheck className="size-4" />Ordered after your yes</div>
        </div>
      </div>
    </div>
  );
}
