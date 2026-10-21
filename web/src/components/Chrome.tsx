// Site chrome: logo, header navigation and footer.
import { Link, NavLink } from "react-router";
import { Gift, Info, TrendingUp, Users } from "../lib/icons";

export function Logo({ small }: { small?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-3 text-ink no-underline">
      <span className={`grid shrink-0 -rotate-6 place-items-center rounded-[14px] bg-linear-to-br from-pink to-peach text-white shadow-[0_6px_16px_rgba(255,92,157,0.3)] ${small ? "size-9" : "size-11"}`}>
        <Gift className={small ? "size-5" : "size-6"} />
      </span>
      <span>
        <span className={`block font-display font-semibold leading-none ${small ? "text-[22px]" : "text-[30px]"}`}>
          Gifty<span className="text-pink">Quest</span>
        </span>
        {!small && <span className="mt-1 block text-[13px] text-muted">Find the gift they will actually love</span>}
      </span>
    </Link>
  );
}

const TABS = [
  { to: "/app", label: "My people", icon: Users, end: false },
  { to: "/trending", label: "Trending", icon: TrendingUp, end: false },
  { to: "/how-it-works", label: "How it works", icon: Info, end: false },
];

export function Header() {
  return (
    <header className="flex flex-wrap items-center gap-x-6 gap-y-3.5">
      <Logo />
      <nav aria-label="Main" className="ml-auto flex flex-wrap gap-1.5">
        {TABS.map(({ to, label, icon: Icon, end }) => (
          <NavLink key={to} to={to} end={end}
            className={({ isActive }) => `btn px-3.5 py-2 text-sm ${isActive ? "bg-pink-soft text-pink" : "text-ink hover:bg-card"}`}>
            <Icon className="size-4" />{label}
          </NavLink>
        ))}
      </nav>
    </header>
  );
}

const COLS: [string, [string, string][]][] = [
  ["Product", [["Home", "/"], ["My people", "/app"], ["Trending", "/trending"], ["How it works", "/how-it-works"]]],
  ["Legal", [["Privacy policy", "/privacy"], ["Terms of use", "/terms"]]],
  ["Company", [["About", "/about"], ["Contact", "/about#contact"]]],
];

export function Footer() {
  return (
    <footer className="mt-2 grid gap-6 border-t-2 border-line pb-2 pt-7 text-sm text-muted">
      <div className="grid grid-cols-2 gap-6 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div className="col-span-2 grid content-start gap-2.5 md:col-span-1">
          <Logo small />
          <p className="max-w-[38ch]">The gift memory for the people you love. Tell Alexa, get it right.</p>
        </div>
        {COLS.map(([title, links]) => (
          <div key={title}>
            <h4 className="mb-2 font-display text-[13px] font-semibold uppercase tracking-[0.05em] text-ink">{title}</h4>
            <ul className="grid gap-1.5">
              {links.map(([label, to]) => (
                <li key={label}><Link to={to} className="font-semibold text-muted hover:text-pink">{label}</Link></li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap justify-between gap-x-5 gap-y-2 border-t-2 border-line pt-3.5 text-[13px]">
        <span>© 2026 GiftyQuest. All rights reserved.</span>
        <span>As an Amazon Associate, GiftyQuest earns from qualifying purchases. Not otherwise affiliated with Amazon.</span>
      </div>
    </footer>
  );
}
