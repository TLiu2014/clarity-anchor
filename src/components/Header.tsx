"use client";

import { useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { ThemeToggle } from "./ThemeToggle";

export function Header() {
  const runAnalysis = useGraphStore((s) => s.runAnalysis);
  const reset = useGraphStore((s) => s.reset);
  const status = useGraphStore((s) => s.status);
  const openSettings = useGraphStore((s) => s.openSettings);
  const [value, setValue] = useState("");

  const running = status === "running";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || running) return;
    runAnalysis(trimmed);
  };

  return (
    <header className="z-30 flex flex-col gap-3 border-b border-slate-200 bg-white/80 px-4 py-3 backdrop-blur md:flex-row md:items-center md:gap-4 dark:border-slate-800 dark:bg-slate-900/80">
      {/* Brand */}
      <div className="flex items-center gap-2.5">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
            <circle cx="12" cy="5" r="2.5" />
            <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
          </svg>
        </span>
        <div className="leading-tight">
          <h1 className="text-lg font-bold tracking-tight text-slate-900 dark:text-slate-50">
            ClarityAnchor
          </h1>
          <p className="hidden text-[11px] text-slate-500 sm:block dark:text-slate-400">
            Your objective Reality Anchor
          </p>
        </div>
      </div>

      {/* Prompt bar */}
      <form onSubmit={submit} className="flex flex-1 items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Describe the trigger or urge you're feeling…"
          className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
        />
        <button
          type="submit"
          disabled={running || !value.trim()}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {running ? (
            <>
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
              </svg>
              Analyzing…
            </>
          ) : (
            "Analyze Urge"
          )}
        </button>
        <button
          type="button"
          onClick={reset}
          disabled={running}
          className="shrink-0 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          Clear
        </button>
      </form>

      {/* Settings + theme */}
      <div className="flex shrink-0 items-center justify-end gap-2">
        <button
          type="button"
          onClick={openSettings}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
          </svg>
          <span className="hidden sm:inline">Ground Rules</span>
        </button>
        <ThemeToggle />
      </div>
    </header>
  );
}
