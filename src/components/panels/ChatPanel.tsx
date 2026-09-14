"use client";

import { useEffect, useRef, useState } from "react";
import { useGraphStore } from "@/store/useGraphStore";
import { STATE_STYLES } from "@/components/flow/stateStyles";
import { SAMPLES, type Sample } from "@/samples";
import { stripMarkdown } from "@/lib/text";

function EmptyState({ onPick }: { onPick: (s: Sample) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="rounded-lg bg-gradient-to-br from-indigo-50 to-violet-50 p-3 dark:from-indigo-950/30 dark:to-violet-950/30">
        <div className="flex items-center gap-1.5 text-sm font-semibold text-indigo-600 dark:text-indigo-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
            <path d="M12 3v18M5.6 5.6l12.8 12.8M3 12h18M5.6 18.4 18.4 5.6" />
          </svg>
          Your objective Reality Anchor
        </div>
        <p className="mt-1 text-xs leading-relaxed text-slate-600 dark:text-slate-400">
          Describe a trigger or urge. The agent checks it against your anchors,
          names any thinking trap, and guides an ERP delay — drawing its
          reasoning on the map. Keep replying to continue the same session.
        </p>
      </div>

      <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
        Try an example
      </div>
      <div className="flex flex-col gap-2">
        {SAMPLES.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => onPick(s)}
            className="group flex flex-col gap-1 rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-left transition-colors hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-indigo-600 dark:hover:bg-indigo-950/30"
          >
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                {s.emoji && <span className="text-base">{s.emoji}</span>}
                {s.title}
              </span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4 shrink-0 text-slate-300 transition-colors group-hover:text-indigo-500">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
            <span className="line-clamp-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
              “{s.prompt}”
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

function TraceChip({
  label,
  state,
  onClick,
}: {
  label: string;
  state: keyof typeof STATE_STYLES;
  onClick: () => void;
}) {
  const style = STATE_STYLES[state];
  return (
    <button
      type="button"
      onClick={onClick}
      title={`View ${label} details`}
      className="flex w-full items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-xs transition-colors hover:brightness-105"
      style={{ borderColor: style.color }}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: style.color }}
      />
      <span className="min-w-0 flex-1 truncate text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <span
        className={[
          "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
          style.badge,
        ].join(" ")}
      >
        {style.label}
      </span>
    </button>
  );
}

export function ChatPanel() {
  const messages = useGraphStore((s) => s.messages);
  const nodes = useGraphStore((s) => s.nodes);
  const status = useGraphStore((s) => s.status);
  const error = useGraphStore((s) => s.error);
  const erpAwaiting = useGraphStore((s) => s.erpAwaiting);
  const runAnalysis = useGraphStore((s) => s.runAnalysis);
  const openDetails = useGraphStore((s) => s.openDetails);
  const reset = useGraphStore((s) => s.reset);
  const setBaselineRules = useGraphStore((s) => s.setBaselineRules);

  const [value, setValue] = useState("");
  const feedEndRef = useRef<HTMLDivElement>(null);

  const running = status === "running";
  const hasSession = messages.length > 0;

  useEffect(() => {
    feedEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, nodes.length, status, error]);

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (!trimmed || running) return;
    runAnalysis(trimmed);
    setValue("");
  };

  const runSample = (s: Sample) => {
    if (running) return;
    // Each sample brings its own anchors so different samples show different
    // anchors (not whatever the first click happened to seed).
    if (s.baselineRules?.length) setBaselineRules(s.baselineRules);
    runAnalysis(s.prompt);
  };

  return (
    <aside className="flex h-full w-full flex-col bg-white dark:bg-slate-950">
      <header className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          Session
        </h2>
        {hasSession && (
          <button
            type="button"
            onClick={() => {
              reset();
              setValue("");
            }}
            disabled={running}
            className="rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            New
          </button>
        )}
      </header>

      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-3 py-3">
        {!hasSession ? (
          <EmptyState onPick={runSample} />
        ) : (
          <>
            {messages.map((m) =>
              m.role === "user" ? (
                <div
                  key={m.id}
                  className="max-w-[92%] self-end rounded-[10px] rounded-br-[3px] bg-indigo-600 px-3 py-2 text-sm text-white"
                >
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-indigo-200">
                    You
                  </div>
                  <div className="whitespace-pre-wrap break-words">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div
                  key={m.id}
                  className="max-w-[92%] self-start rounded-[10px] rounded-bl-[3px] bg-slate-100 px-3 py-2 text-sm text-slate-800 dark:bg-slate-800 dark:text-slate-100"
                >
                  <div className="mb-0.5 text-[10px] font-semibold uppercase tracking-wider text-emerald-500">
                    Reality Anchor
                  </div>
                  <div className="whitespace-pre-wrap break-words leading-relaxed">
                    {stripMarkdown(m.content)}
                  </div>
                </div>
              )
            )}

            {nodes.length > 0 && (
              <div className="mt-1 flex flex-col gap-1.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Chain of thought
                </div>
                {nodes.map((n) => (
                  <TraceChip
                    key={n.id}
                    label={n.data.label}
                    state={n.data.state}
                    onClick={() => openDetails(n.id)}
                  />
                ))}
              </div>
            )}

            {running && erpAwaiting && (
              <div className="inline-flex items-center gap-2 self-start rounded-md border border-amber-200 bg-amber-50 px-3 py-1.5 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="6" y="5" width="4" height="14" rx="1" />
                  <rect x="14" y="5" width="4" height="14" rx="1" />
                </svg>
                Paused — take your time. Resumes when you commit to the delay.
              </div>
            )}

            {running && !erpAwaiting && (
              <div className="inline-flex items-center gap-2 self-start rounded-md border border-blue-200 bg-blue-50 px-3 py-1.5 text-sm text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-300">
                <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 0 1 8-8V0C5.4 0 0 5.4 0 12h4z" />
                </svg>
                Agent is reasoning…
              </div>
            )}

            {error && (
              <div className="self-start rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/50 dark:text-rose-300">
                {error}
              </div>
            )}
          </>
        )}
        <div ref={feedEndRef} />
      </div>

      <form
        onSubmit={submit}
        className="border-t border-slate-200 p-3 dark:border-slate-800"
      >
        <div className="flex items-end gap-2">
          <textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) submit(e);
            }}
            rows={2}
            placeholder={
              hasSession
                ? "Reply to continue, or describe a new urge…"
                : "Describe the trigger or urge you're feeling…"
            }
            className="min-h-[46px] flex-1 resize-none rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100 dark:placeholder:text-slate-500"
          />
          <button
            type="submit"
            disabled={running || !value.trim()}
            className="inline-flex h-[46px] shrink-0 items-center rounded-lg bg-indigo-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {running ? "…" : "Send"}
          </button>
        </div>
      </form>
    </aside>
  );
}
