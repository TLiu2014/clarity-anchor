"use client";

import { useEffect, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { DEFAULT_BASELINE_RULES } from "@/lib/strands/defaults";

/**
 * The user's "Calm Ground Rules" editor. Persists to localStorage (via the
 * store); the rules are sent with every analysis so the agent grounds urges
 * against the user's own agreed facts. Shows a clear read-back of what's
 * currently active so saving never feels like a black box.
 */
export function GroundRulesTab() {
  const baselineRules = useGraphStore((s) => s.baselineRules);
  const setBaselineRules = useGraphStore((s) => s.setBaselineRules);

  const [text, setText] = useState("");
  const [justSaved, setJustSaved] = useState(false);

  // Keep the editor in sync with saved rules (also on first hydration).
  useEffect(() => {
    setText(baselineRules.join("\n"));
  }, [baselineRules]);

  // Clear the "Saved ✓" flash shortly after it shows.
  useEffect(() => {
    if (!justSaved) return;
    const t = setTimeout(() => setJustSaved(false), 2500);
    return () => clearTimeout(t);
  }, [justSaved]);

  const save = () => {
    setBaselineRules(text.split("\n"));
    setJustSaved(true);
  };

  const dirty = text !== baselineRules.join("\n");
  const usingDefaults = baselineRules.length === 0;

  return (
    <div className="flex h-full flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {/* What this is for */}
        <div className="mb-4 rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-3 dark:from-indigo-950/30 dark:to-violet-950/30">
          <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-300">
            These are your <span className="font-semibold">reality anchors</span>
            — objective facts you write while calm. When an urge hits later, the
            agent checks it against these instead of trusting the anxious moment,
            so its answer reflects what you already know to be true.
          </p>
        </div>

        {/* Read-back: what's active right now */}
        <div className="mb-4">
          <div className="mb-1.5 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {usingDefaults ? "In use now · defaults" : `In use now · ${baselineRules.length}`}
            </span>
            {justSaved && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <path d="M20 6 9 17l-5-5" />
                </svg>
                Saved
              </span>
            )}
          </div>
          <ol className="space-y-1.5 rounded-lg border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900">
            {(usingDefaults ? DEFAULT_BASELINE_RULES : baselineRules).map(
              (r, i) => (
                <li
                  key={i}
                  className="flex gap-2 text-sm leading-snug text-slate-700 dark:text-slate-300"
                >
                  <span className="select-none font-semibold text-indigo-400">
                    {i + 1}.
                  </span>
                  <span>{r}</span>
                </li>
              )
            )}
          </ol>
          {usingDefaults && (
            <p className="mt-1.5 text-[11px] text-slate-400">
              No anchors yet — these sensible defaults are used until you save
              your own below.
            </p>
          )}
        </div>

        {/* Editor */}
        <label
          htmlFor="baseline-rules"
          className="mb-1.5 block text-[11px] font-semibold uppercase tracking-wide text-slate-400"
        >
          Edit your anchors — one per line
        </label>
        <textarea
          id="baseline-rules"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={7}
          placeholder={DEFAULT_BASELINE_RULES.join("\n")}
          className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 text-[13px] leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
        />
        <button
          type="button"
          onClick={() => setText(DEFAULT_BASELINE_RULES.join("\n"))}
          className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
        >
          Load examples
        </button>
      </div>

      <div className="border-t border-slate-200 p-3 dark:border-slate-800">
        {dirty && (
          <p className="mb-2 text-center text-[11px] font-medium text-amber-600 dark:text-amber-400">
            Unsaved changes
          </p>
        )}
        <button
          type="button"
          onClick={save}
          disabled={!dirty}
          className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:opacity-50"
        >
          {dirty ? "Save anchors" : justSaved ? "Saved ✓" : "Saved"}
        </button>
      </div>
    </div>
  );
}
