"use client";

import { useEffect, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { DEFAULT_BASELINE_RULES } from "@/lib/strands/defaults";

/**
 * Settings drawer for the user's "Calm Baseline Rules". Rules are persisted to
 * localStorage (via the store) and sent with every analysis so the
 * fetchBaselineRules tool reads the user's real data instead of defaults.
 */
export function SettingsDrawer() {
  const open = useGraphStore((s) => s.settingsOpen);
  const closeSettings = useGraphStore((s) => s.closeSettings);
  const baselineRules = useGraphStore((s) => s.baselineRules);
  const setBaselineRules = useGraphStore((s) => s.setBaselineRules);
  const hydrateSettings = useGraphStore((s) => s.hydrateSettings);

  const [text, setText] = useState("");
  const [saved, setSaved] = useState(false);

  // Hydrate persisted rules from localStorage on first mount.
  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  // Sync the textarea to the store's rules whenever the drawer opens.
  useEffect(() => {
    if (open) {
      setText(baselineRules.join("\n"));
      setSaved(false);
    }
  }, [open, baselineRules]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSettings();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeSettings]);

  const save = () => {
    setBaselineRules(text.split("\n"));
    setSaved(true);
  };

  return (
    <>
      <div
        onClick={closeSettings}
        aria-hidden
        className={[
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      <aside
        role="dialog"
        aria-label="Calm Baseline Rules"
        aria-modal="true"
        className={[
          "fixed inset-y-0 left-0 z-50 flex w-full max-w-md flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900",
          open ? "translate-x-0" : "-translate-x-full",
        ].join(" ")}
      >
        <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div>
            <h2 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Calm Baseline Rules
            </h2>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              Your objective ground rules, written while calm. The agent anchors
              every urge against these.
            </p>
          </div>
          <button
            type="button"
            onClick={closeSettings}
            aria-label="Close settings"
            className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          <label
            htmlFor="baseline-rules"
            className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-slate-400"
          >
            One rule per line
          </label>
          <textarea
            id="baseline-rules"
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              setSaved(false);
            }}
            rows={10}
            placeholder={DEFAULT_BASELINE_RULES.join("\n")}
            className="w-full resize-y rounded-lg border border-slate-300 bg-white p-3 font-mono text-[13px] leading-relaxed text-slate-800 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200"
          />

          <button
            type="button"
            onClick={() => {
              setText(DEFAULT_BASELINE_RULES.join("\n"));
              setSaved(false);
            }}
            className="mt-2 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
          >
            Load example rules
          </button>

          <div className="mt-4 rounded-lg bg-slate-50 p-3 text-xs text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            Saved locally on this device (localStorage). Nothing is sent anywhere
            until you run an analysis.
          </div>
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          <button
            type="button"
            onClick={save}
            className="flex-1 rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            {saved ? "Saved ✓" : "Save Rules"}
          </button>
          <button
            type="button"
            onClick={closeSettings}
            className="rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Done
          </button>
        </footer>
      </aside>
    </>
  );
}
