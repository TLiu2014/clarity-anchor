"use client";

import { useEffect } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { DiagnosticMap } from "@/components/flow/DiagnosticMap";
import { GroundRulesTab } from "./GroundRulesTab";
import { NodeDetailsView } from "./NodeDetailsView";

type TabKey = "rules" | "details" | "map";

export function RightPanel() {
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const rightTab = useGraphStore((s) => s.rightTab);
  const setRightTab = useGraphStore((s) => s.setRightTab);
  const hydrateSettings = useGraphStore((s) => s.hydrateSettings);
  const erpAwaiting = useGraphStore((s) => s.erpAwaiting);
  const noRules = useGraphStore((s) => s.baselineRules.length === 0);

  useEffect(() => {
    hydrateSettings();
  }, [hydrateSettings]);

  // The secondary MAIN view comes first (it's the default); Ground Rules (config)
  // is last and non-default.
  const tabs: { key: TabKey; label: string }[] =
    layoutMode === "focus"
      ? [
          { key: "map", label: "Diagnostic Map" },
          { key: "rules", label: "Anchors" },
        ]
      : [
          { key: "details", label: "Node Details" },
          { key: "rules", label: "Anchors" },
        ];

  const active = tabs.some((t) => t.key === rightTab) ? rightTab : tabs[0].key;

  return (
    <aside className="flex h-full w-full flex-col bg-white dark:bg-slate-950">
      <div
        role="tablist"
        className="flex shrink-0 border-b border-slate-200 dark:border-slate-800"
      >
        {tabs.map((t) => {
          const isActive = active === t.key;
          return (
            <button
              key={t.key}
              role="tab"
              aria-selected={isActive}
              type="button"
              onClick={() => setRightTab(t.key)}
              className={[
                "relative flex-1 px-4 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "text-indigo-600 dark:text-indigo-300"
                  : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200",
              ].join(" ")}
            >
              <span className="inline-flex items-center gap-1.5">
                {t.label}
                {t.key === "details" && erpAwaiting && (
                  <span className="h-2 w-2 animate-pulse rounded-full bg-amber-500" />
                )}
                {t.key === "rules" && noRules && (
                  <span
                    title="Set your anchors"
                    className="h-2 w-2 rounded-full bg-amber-400"
                  />
                )}
              </span>
              {isActive && (
                <span className="absolute inset-x-0 bottom-0 h-0.5 bg-indigo-500" />
              )}
            </button>
          );
        })}
      </div>

      <div className="min-h-0 flex-1">
        {active === "rules" && <GroundRulesTab />}
        {active === "details" && <NodeDetailsView />}
        {active === "map" && (
          <div className="relative h-full w-full bg-slate-50 dark:bg-slate-950">
            <DiagnosticMap />
          </div>
        )}
      </div>
    </aside>
  );
}
