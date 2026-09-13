"use client";

import { useEffect, useRef, useState } from "react";
import {
  useGraphStore,
  isAiConnected,
  type BedrockCreds,
  type FallbackMode,
  type LayoutMode,
  type CenterSplit,
} from "@/store/useGraphStore";

/**
 * Top-right settings dropdown. Currently holds Amazon Bedrock BYOK (bring your
 * own key) and the offline-fallback behavior toggle. Designed to grow more
 * sections later.
 */
export function SettingsMenu() {
  const bedrock = useGraphStore((s) => s.bedrock);
  const setBedrock = useGraphStore((s) => s.setBedrock);
  const fallbackMode = useGraphStore((s) => s.fallbackMode);
  const setFallbackMode = useGraphStore((s) => s.setFallbackMode);
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const setLayoutMode = useGraphStore((s) => s.setLayoutMode);
  const centerSplit = useGraphStore((s) => s.centerSplit);
  const setCenterSplit = useGraphStore((s) => s.setCenterSplit);
  const hydrateSettings = useGraphStore((s) => s.hydrateSettings);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<BedrockCreds>({});
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedFlash, setSavedFlash] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  // Sync form from store when opening.
  useEffect(() => {
    if (open) {
      setForm(bedrock ?? {});
      setShowAdvanced(Boolean(bedrock?.accessKeyId || bedrock?.secretAccessKey));
      setSavedFlash(false);
    }
  }, [open, bedrock]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const connected = isAiConnected(bedrock);

  const update = (patch: Partial<BedrockCreds>) =>
    setForm((f) => ({ ...f, ...patch }));

  const save = () => {
    setBedrock(form);
    setSavedFlash(true);
  };
  const clearKey = () => {
    setBedrock(null);
    setForm({});
  };

  const layoutOptions: { value: LayoutMode; label: string; hint: string }[] = [
    {
      value: "focus",
      label: "Intervention-first",
      hint: "Grounding, distortion & ERP are center; the map is a side tab.",
    },
    {
      value: "map",
      label: "Map-first",
      hint: "The diagnostic map is center; details are a side tab.",
    },
  ];

  const splitOptions: { value: CenterSplit; label: string; hint: string }[] = [
    {
      value: "horizontal",
      label: "Side by side",
      hint: "Main view and side panel sit left–right.",
    },
    {
      value: "vertical",
      label: "Stacked",
      hint: "Main view on top, side panel below (top–bottom).",
    },
  ];

  const fallbackOptions: { value: FallbackMode; label: string; hint: string }[] =
    [
      {
        value: "heuristic",
        label: "Heuristic (offline)",
        hint: "Run the built-in scripted agent so the demo always works.",
      },
      {
        value: "alert",
        label: "Alert me",
        hint: "Don't run anything; warn that no AI is connected.",
      },
    ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label="Settings"
        aria-expanded={open}
        className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-11 z-50 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Settings
            </h3>
            <span
              className={[
                "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                connected
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                  : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400",
              ].join(" ")}
            >
              {connected ? "Bedrock connected" : "Not connected"}
            </span>
          </div>

          {/* Bedrock BYOK */}
          <div className="mb-4">
            <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Amazon Bedrock · your key
            </div>
            <p className="mb-2 text-[11px] leading-snug text-slate-500 dark:text-slate-400">
              Paste a Bedrock API key to drive the agent with a real model. Stored
              only in this browser.
            </p>

            <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Region
            </label>
            <input
              value={form.region ?? ""}
              onChange={(e) => update({ region: e.target.value })}
              placeholder="us-west-2"
              className="mb-2 w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <label className="mb-1 block text-[11px] font-medium text-slate-500 dark:text-slate-400">
              Bedrock API key
            </label>
            <input
              type="password"
              value={form.apiKey ?? ""}
              onChange={(e) => update({ apiKey: e.target.value })}
              placeholder="bedrock-api-key…"
              autoComplete="off"
              className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
            />

            <button
              type="button"
              onClick={() => setShowAdvanced((v) => !v)}
              className="mt-2 text-[11px] font-medium text-indigo-600 hover:underline dark:text-indigo-400"
            >
              {showAdvanced ? "Hide" : "Use IAM access key instead"}
            </button>

            {showAdvanced && (
              <div className="mt-2 space-y-2">
                <input
                  value={form.accessKeyId ?? ""}
                  onChange={(e) => update({ accessKeyId: e.target.value })}
                  placeholder="AWS_ACCESS_KEY_ID"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  type="password"
                  value={form.secretAccessKey ?? ""}
                  onChange={(e) => update({ secretAccessKey: e.target.value })}
                  placeholder="AWS_SECRET_ACCESS_KEY"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
                <input
                  type="password"
                  value={form.sessionToken ?? ""}
                  onChange={(e) => update({ sessionToken: e.target.value })}
                  placeholder="AWS_SESSION_TOKEN (optional)"
                  autoComplete="off"
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"
                />
              </div>
            )}

            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={save}
                className="flex-1 rounded-md bg-indigo-600 py-1.5 text-sm font-semibold text-white transition hover:bg-indigo-500"
              >
                {savedFlash ? "Saved ✓" : "Save key"}
              </button>
              <button
                type="button"
                onClick={clearKey}
                className="rounded-md border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Clear
              </button>
            </div>
          </div>

          {/* Layout */}
          <div className="mb-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Layout
            </div>
            <div className="space-y-1.5">
              {layoutOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="layoutMode"
                    checked={layoutMode === opt.value}
                    onChange={() => setLayoutMode(opt.value)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Panel arrangement */}
          <div className="mb-4 border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              Main + side panel
            </div>
            <div className="space-y-1.5">
              {splitOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="centerSplit"
                    checked={centerSplit === opt.value}
                    onChange={() => setCenterSplit(opt.value)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Fallback behavior */}
          <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              When no AI key is set
            </div>
            <div className="space-y-1.5">
              {fallbackOptions.map((opt) => (
                <label
                  key={opt.value}
                  className="flex cursor-pointer items-start gap-2 rounded-md p-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <input
                    type="radio"
                    name="fallbackMode"
                    checked={fallbackMode === opt.value}
                    onChange={() => setFallbackMode(opt.value)}
                    className="mt-0.5 accent-indigo-600"
                  />
                  <span>
                    <span className="block text-sm font-medium text-slate-800 dark:text-slate-200">
                      {opt.label}
                    </span>
                    <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                      {opt.hint}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
