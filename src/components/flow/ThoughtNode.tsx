"use client";

import { memo } from "react";
import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import type { ThoughtNodeData } from "@/store/useGraphStore";
import { useGraphStore } from "@/store/useGraphStore";
import { STATE_STYLES } from "./stateStyles";

type ThoughtNodeType = Node<ThoughtNodeData, "thought">;

function ThoughtNodeImpl({ id, data, selected }: NodeProps<ThoughtNodeType>) {
  const openDetails = useGraphStore((s) => s.openDetails);
  const style = STATE_STYLES[data.state];

  const handleCls =
    "!h-2.5 !w-2.5 !border-2 !border-slate-300 dark:!border-slate-600 !bg-white dark:!bg-slate-900";

  return (
    <div
      className={[
        "relative w-[240px] rounded-xl border-2 bg-white p-3 shadow-sm transition-shadow dark:bg-slate-900",
        selected ? "ring-2 ring-indigo-400 ring-offset-2 ring-offset-transparent" : "hover:shadow-md",
        style.ring,
      ].join(" ")}
      style={{ borderColor: style.color }}
    >
      <Handle type="target" position={Position.Left} className={handleCls} />

      <div className="flex items-start gap-2.5">
        <span
          className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white"
          style={{ backgroundColor: style.color }}
          aria-hidden
        >
          {data.toolName ? (
            // wrench-ish glyph for tool nodes
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2-2 2.6-2.6z" />
            </svg>
          ) : (
            // anchor glyph for the reasoning node
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="5" r="2.5" />
              <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
            </svg>
          )}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span
              className={[
                "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                style.badge,
              ].join(" ")}
            >
              {style.label}
            </span>
          </div>

          <div className="mt-1.5 truncate font-mono text-sm font-semibold text-slate-800 dark:text-slate-100">
            {data.label}
          </div>

          {data.summary && (
            <p className="mt-0.5 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">
              {data.summary}
            </p>
          )}

          {data.distortion && (
            <p className="mt-1.5 inline-block rounded bg-rose-50 px-1.5 py-0.5 text-[11px] font-medium text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
              Distortion: {data.distortion}
            </p>
          )}

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openDetails(id);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-500 hover:underline dark:text-indigo-400"
          >
            View Details →
          </button>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className={handleCls} />
    </div>
  );
}

export const ThoughtNode = memo(ThoughtNodeImpl);
