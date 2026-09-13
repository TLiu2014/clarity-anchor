import type { ReactNode } from "react";

/**
 * Dependency-free architecture diagram — styled boxes + arrows, theme-aware.
 * (No Mermaid runtime; the live app already visualizes flows with React Flow.)
 */

const TONES: Record<string, string> = {
  slate:
    "border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900",
  indigo:
    "border-indigo-300 bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/40",
  violet:
    "border-violet-300 bg-violet-50 dark:border-violet-800 dark:bg-violet-950/40",
  amber:
    "border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40",
  emerald:
    "border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40",
};

function Box({
  tone = "slate",
  title,
  sub,
  children,
}: {
  tone?: keyof typeof TONES | string;
  title: string;
  sub?: string;
  children?: ReactNode;
}) {
  return (
    <div
      className={`w-full rounded-xl border p-3.5 text-center ${TONES[tone] ?? TONES.slate}`}
    >
      <div className="text-sm font-semibold text-slate-800 dark:text-slate-100">
        {title}
      </div>
      {sub && (
        <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
          {sub}
        </div>
      )}
      {children}
    </div>
  );
}

function Arrow({ label, dir = "down" }: { label?: string; dir?: "down" | "up" }) {
  return (
    <div className="flex flex-col items-center py-1 text-slate-400">
      {label && (
        <span className="mb-0.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {label}
        </span>
      )}
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
        {dir === "down" ? (
          <path d="M12 5v14M6 13l6 6 6-6" />
        ) : (
          <path d="M12 19V5M6 11l6-6 6 6" />
        )}
      </svg>
    </div>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return (
    <span className="inline-block rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-300">
      {children}
    </span>
  );
}

export function ArchitectureDiagram() {
  return (
    <div className="mx-auto max-w-md">
      <Box
        tone="indigo"
        title="Browser"
        sub="Next.js · React Flow diagnostic map · Zustand"
      >
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Pill>chat + trace</Pill>
          <Pill>live map</Pill>
          <Pill>ERP timer</Pill>
        </div>
      </Box>

      <Arrow label="POST { urge, anchors }" />

      <Box
        tone="violet"
        title="AWS Strands Agent"
        sub="model-driven loop · streamed over SSE from /api/agent (Node)"
      >
        <div className="mt-2 flex flex-wrap justify-center gap-1.5">
          <Pill>fetchBaselineRules</Pill>
          <Pill>analyzeDistortion</Pill>
          <Pill>requestErpDelay</Pill>
        </div>
      </Box>

      <Arrow label="invokes the model" />

      <Box
        tone="emerald"
        title="Amazon Bedrock — Claude"
        sub="or built-in heuristic model (no key needed)"
      />

      <Arrow label="streams tool_start / tool_complete / done" dir="up" />

      <Box
        tone="amber"
        title="Human-in-the-loop pause"
        sub="a tool call blocks the loop → user confirms → /api/agent/resume continues it"
      />

      <p className="mt-3 text-center text-xs text-slate-500 dark:text-slate-400">
        Every lifecycle event is streamed back over SSE and drawn on the map as
        it happens.
      </p>
    </div>
  );
}
