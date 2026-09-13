"use client";

import { useEffect, useState } from "react";
import { useGraphStore, isAiConnected } from "@/store/useGraphStore";

/**
 * Nav-bar status pill for the model connection: green when a real model is
 * connected — either via a pasted Bedrock key (BYOK) or server-side env creds —
 * otherwise shows the active offline fallback.
 */
export function ConnectionPill() {
  const bedrock = useGraphStore((s) => s.bedrock);
  const fallbackMode = useGraphStore((s) => s.fallbackMode);

  // Ask the server whether env-based Bedrock is configured (e.g. AWS keys in .env).
  const [serverBedrock, setServerBedrock] = useState(false);
  useEffect(() => {
    let cancelled = false;
    fetch("/api/agent")
      .then((r) => r.json())
      .then((d) => {
        if (!cancelled) setServerBedrock(d?.defaultModel === "bedrock");
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const connected = isAiConnected(bedrock) || serverBedrock;

  const { label, pill, dot } = connected
    ? {
        label: "Bedrock connected",
        pill: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/50 dark:text-emerald-300",
        dot: "bg-emerald-500",
      }
    : fallbackMode === "heuristic"
    ? {
        label: "Heuristic mode",
        pill: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300",
        dot: "bg-slate-400",
      }
    : {
        label: "Not connected",
        pill: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/50 dark:text-amber-300",
        dot: "bg-amber-500",
      };

  return (
    <span
      title={
        connected
          ? "Driving the agent with Amazon Bedrock"
          : fallbackMode === "heuristic"
          ? "No AI key — using the built-in heuristic agent"
          : "No AI key — analyses are blocked until you connect one"
      }
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${pill}`}
    >
      <span className={`h-2 w-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}
