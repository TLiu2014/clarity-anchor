import { Fragment } from "react";
import Link from "next/link";
import { SiteNav, SiteFooter, DEMO_VIDEO_URL } from "./SiteChrome";
import { ArchitectureDiagram } from "./ArchitectureDiagram";

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
      <path d={path} />
    </svg>
  );
}

const FEATURES = [
  {
    title: "Live diagnostic map",
    desc: "Watch the agent reason in real time — each tool call appears as a node, streamed over SSE.",
    path: "M3 12h4l3 8 4-16 3 8h4",
  },
  {
    title: "Your anchors",
    desc: "Objective facts you write while calm. Every urge is grounded against them, not guessed at.",
    path: "M12 7.5V21M5 13a7 7 0 0 0 14 0M9 5a3 3 0 1 1 6 0",
  },
  {
    title: "ERP pause",
    desc: "For compulsive urges the agent pauses and guides a timed delay — you sit with it before acting.",
    path: "M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  },
  {
    title: "AWS Strands + Bedrock",
    desc: "A model-driven Strands agent on Amazon Bedrock (Claude), with a credential-free demo mode.",
    path: "M4 7h16M4 12h16M4 17h10",
  },
];

const STACK = [
  "Next.js",
  "React Flow",
  "Zustand",
  "Tailwind CSS",
  "AWS Strands Agents SDK",
  "Amazon Bedrock",
  "Server-Sent Events",
];

const STEPS = [
  { n: "1", t: "You describe an urge" },
  { n: "2", t: "Grounded against your anchors" },
  { n: "3", t: "The thinking trap is named" },
  { n: "4", t: "A guided ERP pause" },
  { n: "5", t: "A calm, grounded answer" },
];

export function Landing() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteNav active="home" />

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-gradient-to-b from-indigo-50 to-transparent dark:from-indigo-950/30" />
        <div className="mx-auto max-w-4xl px-6 py-20 text-center">
          <span className="inline-block rounded-full border border-indigo-200 bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-800 dark:bg-indigo-950/40 dark:text-indigo-300">
            AWS “Agents for Humans” · Everyday Agents
          </span>
          <h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">
            An AI <span className="text-indigo-600 dark:text-indigo-400">Reality Anchor</span>
            <br />for OCD &amp; anxiety
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg leading-relaxed text-slate-600 dark:text-slate-300">
            Describe an intrusive urge and watch a Strands agent ground it
            against your own anchors, name the thinking trap, and guide an
            Exposure &amp; Response Prevention delay — with its whole
            chain-of-thought drawn live.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-500"
            >
              Launch the app
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </Link>
            <a
              href={DEMO_VIDEO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M8 5v14l11-7z" />
              </svg>
              Watch the demo
            </a>
            <Link
              href="/docs"
              className="rounded-lg border border-slate-300 px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              Read the docs
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-6 py-8">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((f) => (
            <div
              key={f.title}
              className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900"
            >
              <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
                <Icon path={f.path} />
              </div>
              <h3 className="text-sm font-semibold">{f.title}</h3>
              <p className="mt-1 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          How it works
        </h2>
        <div className="mt-8 flex flex-col items-stretch gap-3 md:flex-row md:items-stretch md:justify-center">
          {STEPS.map((s, i) => (
            <Fragment key={s.n}>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900 md:min-w-[9.5rem] md:flex-1 md:flex-col md:justify-center md:text-center">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {s.n}
                </span>
                <span className="text-sm text-slate-700 dark:text-slate-300">
                  {s.t}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="flex shrink-0 items-center justify-center text-slate-300">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5 rotate-90 md:rotate-0">
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </div>
              )}
            </Fragment>
          ))}
        </div>
      </section>

      {/* Architecture preview */}
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h2 className="text-center text-2xl font-bold tracking-tight">
          Under the hood
        </h2>
        <div className="mt-3 flex flex-wrap justify-center gap-2">
          {STACK.map((s) => (
            <span
              key={s}
              className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-medium text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
            >
              {s}
            </span>
          ))}
        </div>
        <div className="mt-8">
          <ArchitectureDiagram />
        </div>
        <div className="mt-6 text-center">
          <Link
            href="/docs#architecture"
            className="text-sm font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
          >
            See the full architecture &amp; docs →
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="text-2xl font-bold tracking-tight">
          Ground the next urge in reality
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-slate-600 dark:text-slate-300">
          No sign-up. Runs on a built-in demo model out of the box, or plug in
          your Amazon Bedrock key for a live LLM.
        </p>
        <div className="mt-6">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg transition hover:from-indigo-400 hover:to-violet-500"
          >
            Launch the app
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
