"use client";

import { useEffect, type ReactNode } from "react";
import { useGraphStore, type ThoughtNode } from "@/store/useGraphStore";
import { STATE_STYLES } from "@/components/flow/stateStyles";
import { ErpDelayPanel } from "@/components/ErpDelayPanel";

/* ---------------------------------------------------------------- helpers -- */

function humanizeKey(k: string): string {
  return k
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mb-4">
      <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-slate-400">
        {title}
      </h4>
      {children}
    </div>
  );
}

/** Readable rendering for any tool output value (arrays, objects, scalars). */
function HumanValue({ value }: { value: unknown }): ReactNode {
  if (value === null || value === undefined || value === "") return null;

  if (Array.isArray(value)) {
    const scalars = value.every((v) => typeof v !== "object" || v === null);
    if (scalars) {
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm text-slate-700 dark:text-slate-300">
          {value.map((v, i) => (
            <li key={i}>{String(v)}</li>
          ))}
        </ul>
      );
    }
    return (
      <div className="space-y-2">
        {value.map((v, i) => (
          <div
            key={i}
            className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-800"
          >
            <HumanValue value={v} />
          </div>
        ))}
      </div>
    );
  }

  if (typeof value === "object") {
    return (
      <dl className="space-y-2">
        {Object.entries(value as Record<string, unknown>).map(([k, v]) => {
          const rendered = <HumanValue value={v} />;
          if (rendered === null) return null;
          return (
            <div key={k}>
              <dt className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                {humanizeKey(k)}
              </dt>
              <dd className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
                {rendered}
              </dd>
            </div>
          );
        })}
      </dl>
    );
  }

  return <span className="text-sm text-slate-700 dark:text-slate-300">{String(value)}</span>;
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: "reality" | "rule" | "calm";
  title: string;
  children: ReactNode;
}) {
  const styles = {
    reality:
      "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200",
    rule: "border-indigo-200 bg-indigo-50 text-indigo-800 dark:border-indigo-900 dark:bg-indigo-950/40 dark:text-indigo-200",
    calm: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200",
  }[tone];
  return (
    <div className={`rounded-xl border p-3.5 ${styles}`}>
      <div className="mb-1 text-xs font-semibold uppercase tracking-wide opacity-80">
        {title}
      </div>
      <div className="text-sm leading-relaxed">{children}</div>
    </div>
  );
}

/* ------------------------------------------------------ per-tool renderers -- */

function RootBody({ node }: { node: ThoughtNode }) {
  const urge = node.data.urge as string | undefined;
  const answer = node.data.answer as string | undefined;
  const matchedRule = node.data.matchedRule as string | undefined;
  return (
    <div className="space-y-4">
      {urge && (
        <Section title="What you're feeling">
          <p className="rounded-lg bg-slate-50 p-3 text-sm italic leading-relaxed text-slate-600 dark:bg-slate-950 dark:text-slate-300">
            “{urge}”
          </p>
        </Section>
      )}
      {answer ? (
        <>
          <Callout tone="reality" title="Grounded in reality">
            {answer}
          </Callout>
          {matchedRule && (
            <Callout tone="rule" title="Checked against your anchor">
              “{matchedRule}”
            </Callout>
          )}
        </>
      ) : (
        <p className="text-sm text-slate-500 dark:text-slate-400">
          The agent is working through your baseline rules and any thinking traps.
          Watch the steps below as it reasons.
        </p>
      )}
    </div>
  );
}

function BaselineRulesBody({ payload }: { payload: unknown }) {
  const p = payload as
    | { rules?: string[]; matchedRule?: string; source?: string }
    | undefined;
  if (!p?.rules) return <HumanValue value={payload} />;
  return (
    <div className="space-y-3">
      <Callout tone="rule" title="Your anchors">
        <ul className="list-disc space-y-1 pl-5">
          {p.rules.map((r, i) => (
            <li key={i}>{r}</li>
          ))}
        </ul>
      </Callout>
      {p.matchedRule && (
        <Section title="The anchor that applies here">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
            {p.matchedRule}
          </p>
        </Section>
      )}
      {p.source && (
        <p className="text-xs text-slate-400">{p.source}</p>
      )}
    </div>
  );
}

function DistortionBody({ payload }: { payload: unknown }) {
  const p = payload as
    | {
        distortion?: string;
        confidence?: string;
        explanation?: string;
        counterEvidence?: string;
      }
    | undefined;
  if (!p?.distortion) return <HumanValue value={payload} />;
  return (
    <div className="space-y-3">
      <Section title="Thinking trap detected">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-md bg-rose-50 px-2.5 py-1 text-sm font-semibold text-rose-600 dark:bg-rose-950/60 dark:text-rose-300">
            {p.distortion}
          </span>
          {p.confidence && (
            <span className="text-xs text-slate-400">{p.confidence} confidence</span>
          )}
        </div>
      </Section>
      {p.explanation && (
        <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
          {p.explanation}
        </p>
      )}
      {p.counterEvidence && (
        <Callout tone="reality" title="Here's the reality">
          {p.counterEvidence}
        </Callout>
      )}
    </div>
  );
}

function ErpBody({ payload }: { payload: unknown }) {
  const p = payload as
    | { minutes?: number; script?: string; rationale?: string }
    | undefined;
  return (
    <div className="space-y-3">
      <ErpDelayPanel />
      {p?.script && (
        <Callout tone="calm" title="What to do">
          {p.script}
        </Callout>
      )}
      {p?.rationale && (
        <Section title="Why this works">
          <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-400">
            {p.rationale}
          </p>
        </Section>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------- view ---- */

function Body({ node }: { node: ThoughtNode }) {
  const { toolName, payload } = node.data;

  if (!toolName) return <RootBody node={node} />;
  if (toolName === "fetchBaselineRules")
    return <BaselineRulesBody payload={payload} />;
  if (toolName === "analyzeDistortion")
    return <DistortionBody payload={payload} />;
  if (toolName === "requestErpDelay") return <ErpBody payload={payload} />;

  // Any other tool: render its output readably (no raw JSON).
  return payload ? (
    <HumanValue value={payload} />
  ) : (
    <p className="text-sm text-slate-500 dark:text-slate-400">
      {node.data.summary ?? "Running…"}
    </p>
  );
}

/** One node's detail card within the scrollable list. */
function NodeCard({ node, active }: { node: ThoughtNode; active: boolean }) {
  const style = STATE_STYLES[node.data.state];
  return (
    <section
      id={`node-detail-${node.id}`}
      className={[
        "scroll-mt-0 border-b-4 px-5 py-4 transition-colors",
        active
          ? "bg-indigo-50/50 dark:bg-indigo-950/20"
          : "border-b-slate-100 dark:border-b-slate-800/60",
      ].join(" ")}
      style={active ? { borderBottomColor: style.color } : undefined}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={[
            "inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
            style.badge,
          ].join(" ")}
        >
          {style.label}
        </span>
        <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
          {node.data.toolName ? node.data.label : "Reality Anchor"}
        </h3>
      </div>
      <div className="mx-auto max-w-xl">
        <Body node={node} />
      </div>
    </section>
  );
}

/**
 * All nodes' details on one scrollable page — so you can read the whole flow at
 * once. The selected node (from a chip / node click, or the live step) scrolls
 * into view and is highlighted.
 */
export function NodeDetailsView() {
  const nodes = useGraphStore((s) => s.nodes);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);

  // Scroll the selected node's card into view when selection changes.
  useEffect(() => {
    if (!selectedNodeId) return;
    const el = document.getElementById(`node-detail-${selectedNodeId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [selectedNodeId, nodes.length]);

  if (nodes.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center px-8 text-center">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-100 text-indigo-500 dark:bg-indigo-950 dark:text-indigo-300">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-6 w-6">
            <circle cx="12" cy="5" r="2.5" />
            <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
          </svg>
        </div>
        <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">
          Describe an urge on the left to begin. Each step of the agent&apos;s
          reasoning will appear here as a card you can scroll through.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      {nodes.map((node) => (
        <NodeCard
          key={node.id}
          node={node}
          active={node.id === selectedNodeId}
        />
      ))}
    </div>
  );
}
