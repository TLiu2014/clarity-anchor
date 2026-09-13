"use client";

import { useEffect, useState } from "react";
import {
  useGraphStore,
  ERP_DELAY_SECONDS as DELAY_SECONDS,
} from "@/store/useGraphStore";

function fmt(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/**
 * Human-in-the-loop ERP panel for the requestErpDelay node. The countdown is
 * anchored to an absolute deadline in the store, so it keeps running even if the
 * user navigates away and comes back (this component remounts). Committing (or
 * the timer reaching zero) resumes the Strands agent loop.
 */
export function ErpDelayPanel() {
  const erpAwaiting = useGraphStore((s) => s.erpAwaiting);
  const erpDeadline = useGraphStore((s) => s.erpDeadline);
  const commitErpDelay = useGraphStore((s) => s.commitErpDelay);

  // Tick to re-render; the real time source is the store deadline.
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!erpAwaiting) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [erpAwaiting]);

  const remaining = erpDeadline
    ? Math.max(0, Math.ceil((erpDeadline - now) / 1000))
    : DELAY_SECONDS;

  // Auto-commit once the deadline passes.
  useEffect(() => {
    if (erpAwaiting && erpDeadline && now >= erpDeadline) {
      commitErpDelay();
    }
  }, [erpAwaiting, erpDeadline, now, commitErpDelay]);

  const pct = (remaining / DELAY_SECONDS) * 100;

  if (erpAwaiting) {
    return (
      <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/50">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
          <h3 className="text-sm font-semibold">Exposure &amp; Response Prevention</h3>
        </div>

        <p className="mt-2 text-sm text-amber-800/90 dark:text-amber-200/90">
          The agent is paused. Don&apos;t act on the urge yet — sit with the
          discomfort and let it crest. Notice it start to fall on its own.
        </p>

        <div className="mt-3 text-center">
          <div className="font-mono text-4xl font-bold tabular-nums text-amber-900 dark:text-amber-200">
            {fmt(remaining)}
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-amber-200 dark:bg-amber-900">
            <div
              className="h-full rounded-full bg-amber-500 transition-[width] duration-1000 ease-linear"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>

        <button
          type="button"
          onClick={() => commitErpDelay()}
          className="mt-4 w-full rounded-lg bg-amber-500 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
        >
          Commit to Delay
        </button>
        <p className="mt-2 text-center text-xs text-amber-700/80 dark:text-amber-300/70">
          Committing early counts — the point is choosing not to act now.
        </p>
      </div>
    );
  }

  // Committed / finished.
  return (
    <div className="mb-4 rounded-xl border border-emerald-300 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/50">
      <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-300">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
          <path d="M20 6 9 17l-5-5" />
        </svg>
        <h3 className="text-sm font-semibold">Delay committed</h3>
      </div>
      <p className="mt-1.5 text-sm text-emerald-700/90 dark:text-emerald-200/90">
        You chose not to act on the compulsion. That&apos;s the rep that
        retrains the loop — well done.
      </p>
    </div>
  );
}
