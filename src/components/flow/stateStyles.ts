import type { ThoughtState } from "@/store/useGraphStore";

/** Presentation metadata for each ThoughtNode lifecycle state. */
export interface StateStyle {
  label: string;
  /** Node border / accent color. */
  color: string;
  /** Tailwind classes for the small status pill. */
  badge: string;
  /** Optional extra ring class (e.g. pulsing while active). */
  ring: string;
}

export const STATE_STYLES: Record<ThoughtState, StateStyle> = {
  pending: {
    label: "Pending",
    color: "#9ca3af", // gray-400
    badge: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300",
    ring: "",
  },
  thinking: {
    label: "Thinking",
    color: "#3b82f6", // blue-500
    badge: "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    ring: "ring-2 ring-blue-400/70 animate-pulse-ring",
  },
  erp: {
    label: "ERP Delay · Awaiting You",
    color: "#eab308", // yellow-500
    badge:
      "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300",
    ring: "ring-2 ring-amber-400/80 animate-pulse-ring",
  },
  resolved: {
    label: "Resolved",
    color: "#22c55e", // green-500
    badge:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    ring: "ring-2 ring-emerald-400/60",
  },
};
