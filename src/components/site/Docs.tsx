import Link from "next/link";
import { SiteNav, SiteFooter, DEMO_VIDEO_URL } from "./SiteChrome";
import { ArchitectureDiagram } from "./ArchitectureDiagram";
import { FullArchitectureDiagram } from "./FullArchitectureDiagram";
import { DocsToc, type TocItem } from "./DocsToc";

const SECTIONS: TocItem[] = [
  { id: "overview", label: "Overview" },
  { id: "architecture", label: "Architecture" },
  { id: "agent", label: "The agent & its tools" },
  { id: "erp", label: "The ERP pause" },
  { id: "anchors", label: "Your anchors" },
  { id: "running", label: "Running it" },
  { id: "stack", label: "Stack" },
];

function H2({ id, children }: { id: string; children: React.ReactNode }) {
  return (
    <h2
      id={id}
      className="scroll-mt-24 border-b border-slate-200 pb-2 text-xl font-bold tracking-tight dark:border-slate-800"
    >
      {children}
    </h2>
  );
}

const STACK: [string, string][] = [
  ["Agent framework", "AWS Strands Agents SDK (@strands-agents/sdk)"],
  ["Model", "Amazon Bedrock (Claude) · built-in heuristic fallback"],
  ["Frontend", "Next.js (App Router), React 19"],
  ["Canvas", "React Flow (@xyflow/react)"],
  ["State", "Zustand"],
  ["Styling", "Tailwind CSS, next-themes"],
  ["Streaming", "Server-Sent Events"],
];

export function Docs() {
  return (
    <div className="min-h-screen bg-white text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <SiteNav active="docs" />

      <div className="mx-auto flex max-w-6xl gap-10 px-6 py-12">
        <aside className="hidden w-56 shrink-0 lg:block">
          <div className="sticky top-24">
            <DocsToc items={SECTIONS} />
          </div>
        </aside>

        <main className="min-w-0 max-w-3xl flex-1 space-y-12">
        <header>
          <h1 className="text-3xl font-bold tracking-tight">Documentation</h1>
          <p className="mt-2 text-slate-600 dark:text-slate-300">
            How ClarityAnchor turns an intrusive urge into a guided, model-driven
            grounding process you can watch unfold.
          </p>
        </header>

        <section className="space-y-3">
          <H2 id="overview">Overview</H2>
          <p className="text-slate-600 dark:text-slate-300">
            ClarityAnchor is an AI “Reality Anchor” for OCD and anxiety. You
            describe a trigger or urge; a Strands agent loads your{" "}
            <em>anchors</em> (objective facts you wrote while calm), checks the
            urge against them, names the cognitive distortion at play, and — for
            compulsive urges — pauses for a timed Exposure &amp; Response
            Prevention (ERP) delay before giving a calm, grounded answer. The
            agent’s entire chain-of-thought is streamed live onto a diagnostic
            map.
          </p>
        </section>

        <section className="space-y-4">
          <H2 id="architecture">Architecture</H2>
          <p className="text-slate-600 dark:text-slate-300">
            The browser posts the urge (and your saved anchors) to a Node API
            route that runs the Strands agent and streams every lifecycle event
            back over SSE. Tools run one at a time so the UI can reveal each step
            as a guided walkthrough.
          </p>
          <div className="rounded-2xl border border-slate-200 bg-slate-50/50 p-6 dark:border-slate-800 dark:bg-slate-900/40">
            <ArchitectureDiagram />
          </div>
          <p className="text-slate-600 dark:text-slate-300">
            The same Strands agent is also packaged for{" "}
            <span className="font-medium text-slate-800 dark:text-slate-100">
              Amazon Bedrock AgentCore Runtime
            </span>{" "}
            (serverless, session-isolated agent hosting) as a standalone{" "}
            <code>/ping</code> + <code>/invocations</code> service — the
            request/response counterpart to the streaming web app.
          </p>
          <FullArchitectureDiagram />
        </section>

        <section className="space-y-3">
          <H2 id="agent">The agent &amp; its tools</H2>
          <p className="text-slate-600 dark:text-slate-300">
            The agent is model-driven: it decides which tools to call. Three
            tools shape the process:
          </p>
          <ul className="space-y-2 text-slate-600 dark:text-slate-300">
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Your anchors</span>{" "}
              — loads your Calm baseline facts and flags the one most relevant to
              the urge.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">The thinking trap</span>{" "}
              — identifies the cognitive distortion (e.g. intolerance of
              uncertainty, magnification) and offers the objective counter.
            </li>
            <li>
              <span className="font-semibold text-slate-800 dark:text-slate-100">Pause &amp; sit with it</span>{" "}
              — the ERP delay; it pauses the agent until you choose to continue.
            </li>
          </ul>
        </section>

        <section className="space-y-3">
          <H2 id="erp">The ERP pause (human-in-the-loop)</H2>
          <p className="text-slate-600 dark:text-slate-300">
            When the agent recommends a delay, its tool call <em>blocks the agent
            loop</em> and the SSE stream goes quiet — the app shows a 3-minute
            countdown and a “Commit to Delay” button. Committing (or the timer
            finishing) hits <code>/api/agent/resume</code>, which releases the
            loop so it can finish with a grounded answer. Sitting with the urge
            before acting is the therapeutic point.
          </p>
        </section>

        <section className="space-y-3">
          <H2 id="anchors">Your anchors</H2>
          <p className="text-slate-600 dark:text-slate-300">
            Anchors are objective facts you set while calm (e.g. “Checking the
            lock once is sufficient”). They’re saved in your browser and sent
            with every analysis, so the agent grounds urges against your own
            agreed reality rather than generic advice. No anchors set? Sensible
            defaults are used.
          </p>
        </section>

        <section className="space-y-3">
          <H2 id="running">Running it</H2>
          <p className="text-slate-600 dark:text-slate-300">
            It works with zero configuration on a built-in, credential-free
            heuristic model. To drive it with a real LLM, add Amazon Bedrock
            credentials (IAM keys or a Bedrock API key) to <code>.env.local</code>{" "}
            or paste a key into the in-app settings — the app auto-detects them
            and the status pill turns green.
          </p>
        </section>

        <section className="space-y-3">
          <H2 id="stack">Stack</H2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <tbody>
                {STACK.map(([k, v]) => (
                  <tr
                    key={k}
                    className="border-b border-slate-100 dark:border-slate-800/60"
                  >
                    <td className="py-2 pr-4 font-semibold text-slate-800 dark:text-slate-200">
                      {k}
                    </td>
                    <td className="py-2 text-slate-600 dark:text-slate-400">
                      {v}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <div className="flex flex-wrap gap-3 pt-4">
          <Link
            href="/app"
            className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:from-indigo-400 hover:to-violet-500"
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
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M8 5v14l11-7z" />
            </svg>
            Watch the demo
          </a>
          <Link
            href="/"
            className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            Back to home
          </Link>
        </div>
        </main>
      </div>

      <SiteFooter />
    </div>
  );
}
