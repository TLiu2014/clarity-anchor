"use client";

import { useEffect } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { STATE_STYLES } from "@/components/flow/stateStyles";
import { ErpDelayPanel } from "@/components/ErpDelayPanel";

/**
 * Right-side slide-in drawer showing the selected ThoughtNode's tool output /
 * reasoning. Opened via the node's "View Details" button or a node click.
 */
export function DetailsDrawer() {
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const node = useGraphStore((s) =>
    s.nodes.find((n) => n.id === s.selectedNodeId)
  );
  const closeDetails = useGraphStore((s) => s.closeDetails);
  const erpNodeId = useGraphStore((s) => s.erpNodeId);

  const open = Boolean(selectedNodeId && node);
  const isErpNode = Boolean(node && erpNodeId && node.id === erpNodeId);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDetails();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, closeDetails]);

  const style = node ? STATE_STYLES[node.data.state] : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={closeDetails}
        aria-hidden
        className={[
          "fixed inset-0 z-40 bg-slate-950/30 backdrop-blur-sm transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        ].join(" ")}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-label="Node details"
        aria-modal="true"
        className={[
          "fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col border-l border-slate-200 bg-white shadow-2xl transition-transform duration-200 dark:border-slate-800 dark:bg-slate-900",
          open ? "translate-x-0" : "translate-x-full",
        ].join(" ")}
      >
        {node && style && (
          <>
            <header className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="min-w-0">
                <span
                  className={[
                    "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                    style.badge,
                  ].join(" ")}
                >
                  {style.label}
                </span>
                <h2 className="mt-1.5 truncate font-mono text-base font-semibold text-slate-900 dark:text-slate-100">
                  {node.data.label}
                </h2>
                {node.data.toolName && (
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Strands tool · {node.data.toolName}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeDetails}
                aria-label="Close details"
                className="rounded-md p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </header>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {isErpNode && <ErpDelayPanel />}

              {node.data.summary && (
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Status
                  </h3>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {node.data.summary}
                  </p>
                </div>
              )}

              {node.data.distortion && (
                <div className="mb-4">
                  <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Cognitive Distortion Identified
                  </h3>
                  <p className="inline-block rounded-md bg-rose-50 px-2 py-1 text-sm font-medium text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
                    {node.data.distortion}
                  </p>
                </div>
              )}

              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Tool Output
                </h3>
                <pre className="whitespace-pre-wrap rounded-lg bg-slate-50 p-3 font-mono text-[13px] leading-relaxed text-slate-700 dark:bg-slate-950 dark:text-slate-300">
                  {node.data.detail ?? "No output yet."}
                </pre>
              </div>
            </div>

            <footer className="border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <button
                type="button"
                onClick={closeDetails}
                className="w-full rounded-lg bg-slate-100 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                Close
              </button>
            </footer>
          </>
        )}
      </aside>
    </>
  );
}
