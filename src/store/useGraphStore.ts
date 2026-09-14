import { create } from "zustand";
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
} from "@xyflow/react";

/** Visual/lifecycle state for a ThoughtNode. */
export type ThoughtState = "pending" | "thinking" | "erp" | "resolved";

/** Data payload carried by every ThoughtNode on the Diagnostic Map. */
export interface ThoughtNodeData {
  label: string;
  toolName?: string;
  state: ThoughtState;
  summary?: string;
  detail?: string;
  payload?: unknown;
  distortion?: string;
  /** Logical grid coords used to re-layout when flow direction changes. */
  turn?: number;
  step?: number;
  [key: string]: unknown;
}

export type ThoughtNode = Node<ThoughtNodeData, "thought">;

export type AgentStatus = "idle" | "running" | "done";

/** A single chat turn in the transcript. */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
}

/** Bring-your-own-key credentials for Amazon Bedrock. */
export interface BedrockCreds {
  region?: string;
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

/** What to do when no real AI model is configured. */
export type FallbackMode = "heuristic" | "alert";

/**
 * Which of the two main views is the hero:
 *  - "focus": the humanized intervention (node details) is center; map is a side tab
 *  - "map":   the diagnostic map is center; details is a side tab
 */
export type LayoutMode = "focus" | "map";

/** How the center view and the side panel are arranged relative to each other. */
export type CenterSplit = "horizontal" | "vertical";

/** SSE chunk shapes emitted by /api/agent. */
type AgentEvent =
  | { type: "start"; prompt: string; runId?: string }
  | { type: "tool_start"; name?: string; toolUseId?: string; input?: unknown }
  | { type: "tool_complete"; name?: string; toolUseId?: string; output?: unknown }
  | { type: "erp_await"; runId?: string; input?: unknown }
  | { type: "erp_resume"; runId?: string; outcome?: unknown }
  | { type: "done"; response?: string; stopReason?: string }
  | { type: "error"; error?: string; code?: string };

/** Length of the ERP delay countdown. */
export const ERP_DELAY_SECONDS = 180;

const BASELINE_RULES_KEY = "clarityanchor:baselineRules";
const BEDROCK_KEY = "clarityanchor:bedrock";
const FALLBACK_KEY = "clarityanchor:fallbackMode";
const LAYOUT_KEY = "clarityanchor:layoutMode";
const SPLIT_KEY = "clarityanchor:centerSplit";

interface GraphState {
  status: AgentStatus;
  nodes: ThoughtNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  error: string | null;

  // Conversation
  conversationId: string | null;
  turn: number;
  messages: ChatMessage[];

  // Persistent settings
  baselineRules: string[];
  bedrock: BedrockCreds | null;
  fallbackMode: FallbackMode;
  layoutMode: LayoutMode;
  centerSplit: CenterSplit;
  rightTab: "rules" | "details" | "map";

  // ERP human-in-the-loop pause
  runId: string | null;
  erpNodeId: string | null;
  erpAwaiting: boolean;
  /** Absolute epoch ms when the ERP countdown ends (survives panel remounts). */
  erpDeadline: number | null;

  // React Flow wiring
  onNodesChange: (changes: NodeChange<ThoughtNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // UI actions
  openDetails: (nodeId: string) => void;
  closeDetails: () => void;
  setRightTab: (tab: "rules" | "details" | "map") => void;
  reset: () => void;

  // Settings persistence
  hydrateSettings: () => void;
  setBaselineRules: (rules: string[]) => void;
  setBedrock: (creds: BedrockCreds | null) => void;
  setFallbackMode: (mode: FallbackMode) => void;
  setLayoutMode: (mode: LayoutMode) => void;
  setCenterSplit: (split: CenterSplit) => void;

  // ERP commit (resume the paused agent)
  commitErpDelay: () => void;

  // Graph mutation primitives
  addThoughtNode: (node: ThoughtNode) => void;
  connectNodes: (source: string, target: string) => void;
  patchNode: (id: string, data: Partial<ThoughtNodeData>) => void;
  /** Recompute all node positions for the current flow direction. */
  relayout: () => void;

  // Live agent execution (SSE)
  runAnalysis: (prompt: string) => void;
}

/** True when the user has supplied usable Bedrock credentials. */
export function isAiConnected(bedrock: BedrockCreds | null): boolean {
  if (!bedrock) return false;
  return Boolean(
    bedrock.apiKey?.trim() ||
      (bedrock.accessKeyId?.trim() && bedrock.secretAccessKey?.trim())
  );
}

/** Per-tool presentation on the Diagnostic Map. */
const TOOL_META: Record<
  string,
  { runningSummary: string; summary: string; finalState: ThoughtState }
> = {
  fetchBaselineRules: {
    runningSummary: "Loading your anchors…",
    summary: "Anchors loaded",
    finalState: "resolved",
  },
  analyzeDistortion: {
    runningSummary: "Analyzing for distortions…",
    summary: "Distortion identified",
    finalState: "resolved",
  },
  requestErpDelay: {
    runningSummary: "Preparing ERP delay…",
    summary: "ERP delay — sit with the urge",
    finalState: "erp",
  },
};

type FlowDir = "horizontal" | "vertical";

const TOP = 40;
const H_STEP_X = 360; // horizontal flow: spacing between steps (→)
const H_TURN_Y = 260; // horizontal flow: spacing between turns (rows)
const V_STEP_Y = 230; // vertical flow: spacing between steps (↓) — > node height
const V_TURN_X = 340; // vertical flow: spacing between turns (columns) — > node width

/**
 * Choose the flow direction from the panel arrangement: when panels are
 * side-by-side (narrow columns) build the flow top-down so it fits; when
 * stacked (wide, short) build it left-right.
 */
function flowDir(centerSplit: CenterSplit): FlowDir {
  return centerSplit === "horizontal" ? "vertical" : "horizontal";
}

function nodePos(turn: number, step: number, dir: FlowDir) {
  return dir === "vertical"
    ? { x: 40 + turn * V_TURN_X, y: TOP + step * V_STEP_Y }
    : { x: step * H_STEP_X, y: TOP + turn * H_TURN_Y };
}

/** Friendly, non-technical display names for each tool. */
const TOOL_LABELS: Record<string, string> = {
  fetchBaselineRules: "Your anchors",
  analyzeDistortion: "The thinking trap",
  requestErpDelay: "Pause & sit with it",
};

function prettifyName(name: string): string {
  return name
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/^./, (c) => c.toUpperCase());
}

/** A human-readable label for a tool node (falls back to a spaced name). */
export function toolLabel(name?: string): string {
  if (!name) return "Step";
  return TOOL_LABELS[name] ?? prettifyName(name);
}

const RULE_STOPWORDS = new Set([
  "the", "and", "for", "with", "that", "this", "have", "just", "again", "need",
  "feel", "like", "will", "your", "you", "but", "not", "its", "was", "are",
]);

/** Pick the ground rule most relevant to the urge (keyword overlap). */
function matchRule(urge: string, rules: string[]): string | undefined {
  if (!rules || rules.length === 0) return undefined;
  const words = (urge.toLowerCase().match(/[a-z]{4,}/g) ?? []).filter(
    (w) => !RULE_STOPWORDS.has(w)
  );
  let best = rules[0];
  let bestScore = 0;
  for (const r of rules) {
    const rl = r.toLowerCase();
    let score = 0;
    for (const w of words) if (rl.includes(w)) score += 1;
    if (score > bestScore) {
      bestScore = score;
      best = r;
    }
  }
  return best;
}

function metaFor(name?: string) {
  return (
    (name && TOOL_META[name]) || {
      runningSummary: "Running…",
      summary: "Done",
      finalState: "resolved" as ThoughtState,
    }
  );
}

function newId(): string {
  return typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.round(Math.random() * 1e6)}`;
}

function short(s: string, n = 40): string {
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

function formatDetail(input: unknown, output: unknown): string {
  const parts: string[] = [];
  if (input && typeof input === "object" && Object.keys(input).length > 0) {
    parts.push(`Input:\n${JSON.stringify(input, null, 2)}`);
  }
  const out =
    typeof output === "string" ? output : JSON.stringify(output, null, 2);
  parts.push(`Output:\n${out}`);
  return parts.join("\n\n");
}

export const useGraphStore = create<GraphState>((set, get) => ({
  status: "idle",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  error: null,

  conversationId: null,
  turn: 0,
  messages: [],

  baselineRules: [],
  bedrock: null,
  fallbackMode: "heuristic",
  layoutMode: "focus",
  centerSplit: "horizontal",
  // Default the side panel to the secondary MAIN view (the DAG in focus mode),
  // not Ground Rules — rules are config, one click away.
  rightTab: "map",

  runId: null,
  erpNodeId: null,
  erpAwaiting: false,
  erpDeadline: null,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) =>
    set((s) => ({ edges: addEdge(connection, s.edges) })),

  openDetails: (nodeId) =>
    set((s) => ({
      selectedNodeId: nodeId,
      // In focus mode the details are already the center view; only switch the
      // side tab when the map is center (details lives in the side panel).
      rightTab: s.layoutMode === "map" ? "details" : s.rightTab,
    })),
  closeDetails: () => set({ selectedNodeId: null }),
  setRightTab: (tab) => set({ rightTab: tab }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      status: "idle",
      selectedNodeId: null,
      error: null,
      conversationId: null,
      turn: 0,
      messages: [],
      runId: null,
      erpNodeId: null,
      erpAwaiting: false,
      erpDeadline: null,
    }),

  hydrateSettings: () => {
    if (typeof window === "undefined") return;
    try {
      const rules = window.localStorage.getItem(BASELINE_RULES_KEY);
      if (rules) {
        const parsed = JSON.parse(rules);
        if (Array.isArray(parsed)) {
          set({ baselineRules: parsed.filter((r) => typeof r === "string") });
        }
      }
      const bedrock = window.localStorage.getItem(BEDROCK_KEY);
      if (bedrock) {
        const parsed = JSON.parse(bedrock);
        if (parsed && typeof parsed === "object") set({ bedrock: parsed });
      }
      const fb = window.localStorage.getItem(FALLBACK_KEY);
      if (fb === "heuristic" || fb === "alert") set({ fallbackMode: fb });
      const lm = window.localStorage.getItem(LAYOUT_KEY);
      if (lm === "focus" || lm === "map") set({ layoutMode: lm });
      const cs = window.localStorage.getItem(SPLIT_KEY);
      if (cs === "horizontal" || cs === "vertical") set({ centerSplit: cs });
    } catch {
      // ignore malformed storage
    }
  },

  setBaselineRules: (rules) => {
    const cleaned = rules.map((r) => r.trim()).filter(Boolean);
    set({ baselineRules: cleaned });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(BASELINE_RULES_KEY, JSON.stringify(cleaned));
      } catch {
        /* ignore */
      }
    }
  },

  setBedrock: (creds) => {
    const cleaned =
      creds && isAiConnected(creds) ? creds : creds && Object.values(creds).some(Boolean) ? creds : null;
    set({ bedrock: cleaned });
    if (typeof window !== "undefined") {
      try {
        if (cleaned) {
          window.localStorage.setItem(BEDROCK_KEY, JSON.stringify(cleaned));
        } else {
          window.localStorage.removeItem(BEDROCK_KEY);
        }
      } catch {
        /* ignore */
      }
    }
  },

  setFallbackMode: (mode) => {
    set({ fallbackMode: mode });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(FALLBACK_KEY, mode);
      } catch {
        /* ignore */
      }
    }
  },

  setLayoutMode: (mode) => {
    set((s) => ({
      layoutMode: mode,
      // Keep the side tab valid for the new layout. Preserve Ground Rules if the
      // user was on it; otherwise show the new mode's secondary main view.
      rightTab:
        s.rightTab === "rules"
          ? "rules"
          : mode === "focus"
          ? "map"
          : "details",
    }));
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(LAYOUT_KEY, mode);
      } catch {
        /* ignore */
      }
    }
  },

  setCenterSplit: (split) => {
    set({ centerSplit: split });
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem(SPLIT_KEY, split);
      } catch {
        /* ignore */
      }
    }
  },

  commitErpDelay: async () => {
    const { runId, erpNodeId, erpAwaiting, patchNode } = get();
    if (!erpAwaiting || !runId) return;
    set({ erpAwaiting: false, erpDeadline: null });
    if (erpNodeId) {
      patchNode(erpNodeId, {
        state: "resolved",
        summary: "Delay committed — you sat with the urge",
      });
    }
    try {
      await fetch("/api/agent/resume", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ runId }),
      });
    } catch {
      /* server-side safety timeout will also resume */
    }
  },

  addThoughtNode: (node) => set((s) => ({ nodes: [...s.nodes, node] })),

  connectNodes: (source, target) =>
    set((s) => ({
      edges: addEdge(
        { id: `e-${source}-${target}`, source, target, animated: true },
        s.edges
      ),
    })),

  patchNode: (id, data) =>
    set((s) => ({
      nodes: s.nodes.map((n) =>
        n.id === id ? { ...n, data: { ...n.data, ...data } } : n
      ),
    })),

  relayout: () =>
    set((s) => {
      const dir = flowDir(s.centerSplit);
      return {
        nodes: s.nodes.map((n) => ({
          ...n,
          position: nodePos(n.data.turn ?? 0, n.data.step ?? 0, dir),
        })),
      };
    }),

  /**
   * Runs one chat turn against /api/agent over SSE. A session's turns share a
   * conversationId (context is preserved server-side), and each turn APPENDS a
   * new lane of nodes to the map instead of wiping it — so the whole
   * conversation stays visible.
   */
  runAnalysis: async (prompt) => {
    const s0 = get();
    if (s0.status === "running") return;

    const isNew = s0.messages.length === 0 || !s0.conversationId;
    const conversationId = s0.conversationId ?? newId();
    const turn = isNew ? 0 : s0.turn + 1;
    const runId = newId();

    // Snapshot for rollback if the agent isn't connected (alert mode).
    const prev = { nodes: s0.nodes, edges: s0.edges, messages: s0.messages };

    const rootId = `t${turn}-root`;
    const dir = flowDir(s0.centerSplit);
    const rootNode: ThoughtNode = {
      id: rootId,
      type: "thought",
      position: nodePos(turn, 0, dir),
      data: {
        label: short(prompt, 38),
        state: "thinking",
        summary: turn === 0 ? "Reasoning about the urge…" : "Following up…",
        urge: prompt,
        detail: `You said:\n"${prompt}"\n\nThe agent is grounding this against your anchors.`,
        turn,
        step: 0,
      },
    };

    const userMsg: ChatMessage = { id: newId(), role: "user", content: prompt };

    set({
      status: "running",
      error: null,
      conversationId,
      turn,
      runId,
      // In focus mode the center shows node details, so select this turn's root
      // immediately (it holds the urge, then the grounding answer).
      selectedNodeId: s0.layoutMode === "focus" ? rootId : null,
      erpNodeId: null,
      erpAwaiting: false,
      erpDeadline: null,
      messages: [...s0.messages, userMsg],
      nodes: isNew ? [rootNode] : [...s0.nodes, rootNode],
      edges: isNew ? [] : s0.edges,
    });

    const { addThoughtNode, connectNodes, patchNode } = get();

    let toolIndex = 0;
    let lastNodeId = rootId;
    let matchedRule: string | undefined;
    const nodeIdByToolUseId = new Map<string, string>();
    const inputByToolUseId = new Map<string, unknown>();

    const handle = (event: AgentEvent) => {
      switch (event.type) {
        case "tool_start": {
          toolIndex += 1;
          const key = event.toolUseId ?? `${event.name}-${toolIndex}`;
          const id = `t${turn}-tool-${key}`;
          if (event.toolUseId) nodeIdByToolUseId.set(event.toolUseId, id);
          if (event.toolUseId) inputByToolUseId.set(event.toolUseId, event.input);
          const meta = metaFor(event.name);

          addThoughtNode({
            id,
            type: "thought",
            position: nodePos(turn, toolIndex, dir),
            data: {
              label: toolLabel(event.name),
              toolName: event.name,
              state: "thinking",
              summary: meta.runningSummary,
              detail: event.input
                ? `Input:\n${JSON.stringify(event.input, null, 2)}`
                : "Running…",
              turn,
              step: toolIndex,
            },
          });
          connectNodes(lastNodeId, id);
          lastNodeId = id;
          break;
        }
        case "tool_complete": {
          const id =
            (event.toolUseId && nodeIdByToolUseId.get(event.toolUseId)) ||
            lastNodeId;
          const meta = metaFor(event.name);
          const input = event.toolUseId
            ? inputByToolUseId.get(event.toolUseId)
            : undefined;
          const distortion =
            event.name === "analyzeDistortion"
              ? (event.output as { distortion?: string } | undefined)?.distortion
              : undefined;

          // For the rules step, mark which rule is most relevant to the urge so
          // the UI can attribute the grounding to a specific rule.
          let output = event.output;
          if (event.name === "fetchBaselineRules") {
            const rules =
              (output as { rules?: string[] } | undefined)?.rules ?? [];
            matchedRule = matchRule(prompt, rules);
            output = { ...(output as object), matchedRule };
          }

          patchNode(id, {
            state: get().erpNodeId === id ? "resolved" : meta.finalState,
            summary:
              get().erpNodeId === id
                ? "Delay complete — urge passed"
                : meta.summary,
            detail: formatDetail(input, output),
            payload: output,
            distortion,
          });
          // Scroll the detail view to this section now that it's done.
          set({ selectedNodeId: id });
          break;
        }
        case "erp_await": {
          const id = lastNodeId;
          set((s) => ({
            erpNodeId: id,
            erpAwaiting: true,
            // Anchor the countdown to an absolute deadline so it keeps running
            // even if the user navigates away and back (panel remounts).
            erpDeadline: Date.now() + ERP_DELAY_SECONDS * 1000,
            selectedNodeId: id,
            // Surface the ERP node: in map mode that's the side Details tab.
            rightTab: s.layoutMode === "map" ? "details" : s.rightTab,
          }));
          patchNode(id, {
            state: "erp",
            summary: "Awaiting you — sit with the urge",
          });
          break;
        }
        case "erp_resume": {
          set({ erpAwaiting: false });
          break;
        }
        case "done": {
          patchNode(rootId, {
            state: "resolved",
            summary: "Grounded in reality",
            detail: event.response ?? "",
            answer: event.response ?? "",
            matchedRule,
          });
          set((s) => ({
            status: "done",
            // In focus mode, return the center to the root so the user reads the
            // grounding answer (unless they're mid-ERP on this node).
            selectedNodeId:
              s.layoutMode === "focus" && !s.erpAwaiting
                ? rootId
                : s.selectedNodeId,
            messages: [
              ...s.messages,
              {
                id: newId(),
                role: "assistant",
                content: event.response ?? "",
              },
            ],
          }));
          break;
        }
        case "error": {
          if (event.code === "not_connected") {
            // No flow — roll back the nodes/edges but KEEP the user's message
            // so the "not connected" alert renders alongside what they asked.
            set({
              nodes: prev.nodes,
              edges: prev.edges,
              status: "done",
              error: event.error ?? "Agent not connected.",
            });
          } else {
            patchNode(rootId, {
              state: "pending",
              summary: "Agent unavailable",
              detail: event.error ?? "Unknown error",
            });
            set({ status: "done", error: event.error ?? "Agent unavailable" });
          }
          break;
        }
        default:
          break;
      }
    };

    try {
      const res = await fetch("/api/agent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          runId,
          conversationId,
          baselineRules: get().baselineRules,
          fallbackMode: get().fallbackMode,
          bedrock: get().bedrock,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() ?? "";
        for (const frame of frames) {
          const line = frame.split("\n").find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            handle(JSON.parse(line.slice(5).trim()) as AgentEvent);
          } catch {
            /* ignore malformed frame */
          }
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Agent unavailable";
      handle({ type: "error", error: message });
    } finally {
      if (get().status === "running") set({ status: "done" });
    }
  },
}));
