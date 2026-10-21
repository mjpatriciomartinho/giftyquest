import { ArrowLeftRight } from "lucide-react";
import { ContentPage, H2 } from "./Content";

const STEPS = [
  ["Tell Alexa about them", "A two-minute voice interview: favorite artists, food, hobbies, what they can't stand.", "bg-pink-soft"],
  ["Drop hints anytime", "“Alexa, note that Javier loved that lamp.” Hints land on their card with the date.", "bg-mint-soft"],
  ["Get ideas with reasons", "Before a birthday, Alexa asks your budget and suggests gifts, each with the reason it fits.", "bg-sky-soft"],
  ["It learns every year", "Tell Alexa how the gift went. Next time, the ideas get better.", "bg-lemon-soft"],
];

export function HowItWorks() {
  return (
    <ContentPage title="How GiftyQuest works"
      lead="GiftyQuest is a gift memory for the people you love. You fill it by talking to Alexa or typing on the web, and Alexa uses it to suggest gifts that actually fit.">
      <div className="grid !max-w-none gap-3 [grid-template-columns:repeat(auto-fit,minmax(210px,1fr))]">
        {STEPS.map(([title, text, bg], i) => (
          <div key={title} className={`grid content-start gap-1.5 rounded-[18px] p-4 ${bg}`}>
            <span className="font-display text-sm font-semibold text-muted">Step {i + 1}</span>
            <b className="font-display text-lg font-semibold leading-tight">{title}</b>
            <p className="text-sm text-muted">{text}</p>
          </div>
        ))}
      </div>
      <H2>Under the hood</H2>
      <div className="flex !max-w-none flex-wrap items-center gap-2.5">
        {[
          ["Your cards", "The GiftyQuest web app, where you can see and edit everything."],
          ["GiftyQuest MCP server", "An open standard that lets assistants read and update your cards."],
          ["Alexa+", "Or any assistant that speaks MCP, such as Claude."],
        ].map(([t, d], i) => (
          <div key={t} className="contents">
            {i > 0 && <ArrowLeftRight className="size-5 shrink-0 text-muted" aria-hidden />}
            <div className="grid flex-[1_1_180px] gap-0.5 rounded-2xl bg-paper px-4 py-3.5">
              <b className="font-display font-semibold">{t}</b><span className="text-[13px] text-muted">{d}</span>
            </div>
          </div>
        ))}
      </div>
      <H2>What makes it different</H2>
      <ul className="grid list-disc gap-1 pl-5">
        <li><b>Hints with a date and a source.</b> You remember who said what, and when.</li>
        <li><b>Alexa's guesses come with a reason,</b> and you decide which ones to keep.</li>
        <li><b>Gift history with reactions.</b> No more giving the same thing twice, or something they didn't like.</li>
        <li><b>Secret by design.</b> On a shared Echo, Alexa only talks about a gift with the person who is planning it.</li>
      </ul>
    </ContentPage>
  );
}

export function Privacy() {
  return (
    <ContentPage title="Privacy policy" draft updated="2026-10-08">
      <p>This draft covers the GiftyQuest prototype.</p>
      <H2>What we store</H2>
      <p>The profiles you create about the people you shop for: name, relationship, important dates, sizes, likes, dislikes, allergies, hints and gift history. We store only what you type on the web or tell Alexa.</p>
      <H2>What we never do</H2>
      <ul className="grid list-disc gap-1 pl-5"><li>We do not sell your data.</li><li>We do not use it for advertising.</li><li>We do not contact the people you create profiles about.</li></ul>
      <H2>Demo accounts</H2>
      <p>Each visitor to the demo gets a temporary account with example data. It is deleted automatically after 24 hours, together with anything added to it.</p>
      <H2>Alexa and voice</H2>
      <p>When you use GiftyQuest through Alexa, your voice is processed by Amazon under the Alexa terms. GiftyQuest receives the text of your request, not the audio.</p>
      <H2>Purchases</H2>
      <p>Purchases in the prototype are simulated. We do not collect payment details.</p>
      <H2>Your controls</H2>
      <p>You can edit or delete any person, hint or gift at any time, and delete your whole account in one step.</p>
      <H2>Contact</H2>
      <p>Questions about privacy: <span className="select-all rounded-md bg-paper px-2 py-0.5 font-mono">privacy@giftyquest.com</span> (placeholder address until launch).</p>
    </ContentPage>
  );
}

export function Terms() {
  return (
    <ContentPage title="Terms of use" draft updated="2026-10-08">
      <H2>The service</H2>
      <p>GiftyQuest helps you remember the people you shop for and suggests gift ideas. It is a prototype built for the Amazon “Build, Ship, Shape” developer hackathon.</p>
      <H2>Prototype status</H2>
      <p>The service is provided as is, without warranty. Features may change or stop working while we build it.</p>
      <H2>Gift ideas and purchases</H2>
      <p>Gift ideas are suggestions. When a real Amazon product is shown, its price and availability come from Amazon at the time of the search and may change. Checkout inside the conversation is simulated and no order is placed.</p>
      <H2>Amazon links</H2>
      <p>Product links to Amazon are affiliate links. As an Amazon Associate, GiftyQuest earns from qualifying purchases, at no extra cost to you.</p>
      <H2>Your content</H2>
      <p>What you add stays yours. Only add information you are comfortable keeping about the people in your life, and keep it kind.</p>
      <H2>Fair use</H2>
      <p>Do not use GiftyQuest to harass anyone, to store sensitive data that is not needed for gifts, or to overload the service.</p>
    </ContentPage>
  );
}

export function About() {
  return (
    <ContentPage title="About GiftyQuest"
      lead="Someone you love tells you in March that they adore a lamp. In December you have forgotten. GiftyQuest exists so that never happens again.">
      <H2>What it is</H2>
      <p>A gift memory with two doors: a web app where you see and edit everything, and an MCP server so Alexa+ and other assistants can read it, add to it and help you choose.</p>
      <H2>Open source</H2>
      <p>GiftyQuest is open source under the MIT license. The repository will be public on GitHub.</p>
      <H2>Built for</H2>
      <p>The Amazon “Build, Ship, Shape” developer hackathon, 2026. GiftyQuest is an independent project and is not affiliated with or endorsed by Amazon.</p>
      <H2 id="contact">Contact</H2>
      <p><span className="select-all rounded-md bg-paper px-2 py-0.5 font-mono">hello@giftyquest.com</span> (placeholder address until launch).</p>
    </ContentPage>
  );
}
