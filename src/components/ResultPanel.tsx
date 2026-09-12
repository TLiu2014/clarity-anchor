"use client";

import { useGraphStore } from "@/store/useGraphStore";

/**
 * Floating panels over the Diagnostic Map: the agent's final grounding answer
 * (on success) and an error banner (on failure).
 */
export function ResultPanel() {
  const finalResponse = useGraphStore((s) => s.finalResponse);
  const error = useGraphStore((s) => s.error);
  const status = useGraphStore((s) => s.status);
  const closeDetails = useGraphStore((s) => s.openDetails);

  if (error) {
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-5 mx-auto flex max-w-2xl items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 shadow-lg dark:border-rose-900 dark:bg-rose-950/80">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-5 w-5 shrink-0 text-rose-600 dark:text-rose-400">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <div className="text-sm text-rose-700 dark:text-rose-300">
          <p className="font-semibold">The Reality Anchor agent couldn&apos;t run</p>
          <p className="mt-0.5 text-rose-600/90 dark:text-rose-400/90">{error}</p>
        </div>
      </div>
    );
  }

  if (status === "done" && finalResponse) {
    return (
      <div className="pointer-events-auto absolute inset-x-0 bottom-5 mx-auto flex max-w-2xl gap-3 rounded-xl border border-emerald-200 bg-white/95 px-4 py-3.5 shadow-xl backdrop-blur dark:border-emerald-900 dark:bg-slate-900/95">
        <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-500 text-white">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M20 6 9 17l-5-5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
            Reality Anchor · grounding response
          </p>
          <p className="mt-1 text-sm leading-relaxed text-slate-700 dark:text-slate-200">
            {finalResponse}
          </p>
          <button
            type="button"
            onClick={() => closeDetails("agent-root")}
            className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            View full reasoning →
          </button>
        </div>
      </div>
    );
  }

  return null;
}
