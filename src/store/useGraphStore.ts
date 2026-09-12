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
  /** Short title shown on the node. */
  label: string;
  /** Underlying Strands tool this node represents, if any. */
  toolName?: string;
  /** Current lifecycle state — drives the node color. */
  state: ThoughtState;
  /** One-line status shown under the label. */
  summary?: string;
  /** Human-readable detail (input + output) shown in the details drawer. */
  detail?: string;
  /** Raw tool output, injected on tool_complete (shown in the drawer). */
  payload?: unknown;
  /** Cognitive distortion identified by the agent, if any. */
  distortion?: string;
  [key: string]: unknown;
}

export type ThoughtNode = Node<ThoughtNodeData, "thought">;

export type AgentStatus = "idle" | "running" | "done";

/** SSE chunk shapes emitted by /api/agent. */
type AgentEvent =
  | { type: "start"; prompt: string; runId?: string }
  | { type: "tool_start"; name?: string; toolUseId?: string; input?: unknown }
  | { type: "tool_complete"; name?: string; toolUseId?: string; output?: unknown }
  | { type: "erp_await"; runId?: string; input?: unknown }
  | { type: "erp_resume"; runId?: string; outcome?: unknown }
  | { type: "done"; response?: string; stopReason?: string }
  | { type: "error"; error?: string };

const BASELINE_RULES_KEY = "clarityanchor:baselineRules";

interface GraphState {
  prompt: string;
  status: AgentStatus;
  nodes: ThoughtNode[];
  edges: Edge[];
  selectedNodeId: string | null;
  finalResponse: string | null;
  error: string | null;

  // Persistent settings
  baselineRules: string[];
  settingsOpen: boolean;

  // ERP human-in-the-loop pause
  runId: string | null;
  erpNodeId: string | null;
  erpAwaiting: boolean;

  // React Flow wiring
  onNodesChange: (changes: NodeChange<ThoughtNode>[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;

  // UI actions
  setPrompt: (prompt: string) => void;
  openDetails: (nodeId: string) => void;
  closeDetails: () => void;
  reset: () => void;

  // Settings persistence
  hydrateSettings: () => void;
  setBaselineRules: (rules: string[]) => void;
  openSettings: () => void;
  closeSettings: () => void;

  // ERP commit (resume the paused agent)
  commitErpDelay: () => void;

  // Graph mutation primitives
  addThoughtNode: (node: ThoughtNode) => void;
  connectNodes: (source: string, target: string) => void;
  patchNode: (id: string, data: Partial<ThoughtNodeData>) => void;

  // Live agent execution (SSE)
  runAnalysis: (prompt: string) => void;
}

/** Per-tool presentation on the Diagnostic Map. */
const TOOL_META: Record<
  string,
  { runningSummary: string; summary: string; finalState: ThoughtState }
> = {
  fetchBaselineRules: {
    runningSummary: "Fetching Calm Ground Rules…",
    summary: "Baseline rules loaded",
    finalState: "resolved",
  },
  analyzeDistortion: {
    runningSummary: "Analyzing for distortions…",
    summary: "Distortion identified",
    finalState: "resolved",
  },
  requestErpDelay: {
    runningSummary: "Preparing ERP delay…",
    summary: "ERP delay — wait 5 minutes",
    finalState: "erp",
  },
};

const HORIZONTAL_GAP = 340;
const ROW_Y = 160;

function metaFor(name?: string) {
  return (
    (name && TOOL_META[name]) || {
      runningSummary: "Running…",
      summary: "Done",
      finalState: "resolved" as ThoughtState,
    }
  );
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
  prompt: "",
  status: "idle",
  nodes: [],
  edges: [],
  selectedNodeId: null,
  finalResponse: null,
  error: null,
  baselineRules: [],
  settingsOpen: false,
  runId: null,
  erpNodeId: null,
  erpAwaiting: false,

  onNodesChange: (changes) =>
    set((s) => ({ nodes: applyNodeChanges(changes, s.nodes) })),
  onEdgesChange: (changes) =>
    set((s) => ({ edges: applyEdgeChanges(changes, s.edges) })),
  onConnect: (connection) =>
    set((s) => ({ edges: addEdge(connection, s.edges) })),

  setPrompt: (prompt) => set({ prompt }),
  openDetails: (nodeId) => set({ selectedNodeId: nodeId }),
  closeDetails: () => set({ selectedNodeId: null }),

  reset: () =>
    set({
      nodes: [],
      edges: [],
      status: "idle",
      selectedNodeId: null,
      finalResponse: null,
      error: null,
      runId: null,
      erpNodeId: null,
      erpAwaiting: false,
    }),

  hydrateSettings: () => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(BASELINE_RULES_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          set({ baselineRules: parsed.filter((r) => typeof r === "string") });
        }
      }
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
        // ignore storage errors (private mode, quota)
      }
    }
  },

  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  commitErpDelay: async () => {
    const { runId, erpNodeId, erpAwaiting, patchNode } = get();
    if (!erpAwaiting || !runId) return;
    // Flip local state first so the timer / double-click can't resume twice.
    set({ erpAwaiting: false });
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
      // The stream will also resume via the server-side safety timeout.
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

  /**
   * Opens an SSE connection to /api/agent and turns the Strands agent's
   * lifecycle events into a live Diagnostic Map:
   *  - tool_start    → add a new blue (thinking) node, edge from the previous node
   *  - tool_complete → resolve the node (green, or yellow for ERP) + inject output
   *  - done          → resolve the root node and surface the final answer
   */
  runAnalysis: async (prompt) => {
    const rootId = "agent-root";
    const runId =
      typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `run-${Date.now()}`;
    const rootNode: ThoughtNode = {
      id: rootId,
      type: "thought",
      position: { x: 0, y: ROW_Y },
      data: {
        label: "Reality Anchor",
        state: "thinking",
        summary: "Reasoning about the urge…",
        detail: `User trigger:\n"${prompt}"\n\nThe agent is deciding which tools to invoke to ground this thought in objective reality.`,
      },
    };

    set({
      prompt,
      status: "running",
      selectedNodeId: null,
      error: null,
      finalResponse: null,
      nodes: [rootNode],
      edges: [],
      runId,
      erpNodeId: null,
      erpAwaiting: false,
    });

    const { addThoughtNode, connectNodes, patchNode } = get();

    // Local run bookkeeping.
    let toolIndex = 0;
    let lastNodeId = rootId;
    const nodeIdByToolUseId = new Map<string, string>();
    const inputByToolUseId = new Map<string, unknown>();

    const nodeIdFor = (e: { toolUseId?: string; name?: string }) => {
      const key = e.toolUseId ?? `${e.name}-${toolIndex}`;
      return `tool-${key}`;
    };

    const handle = (event: AgentEvent) => {
      switch (event.type) {
        case "tool_start": {
          toolIndex += 1;
          const id = nodeIdFor(event);
          if (event.toolUseId) nodeIdByToolUseId.set(event.toolUseId, id);
          if (event.toolUseId) inputByToolUseId.set(event.toolUseId, event.input);
          const meta = metaFor(event.name);

          addThoughtNode({
            id,
            type: "thought",
            position: { x: HORIZONTAL_GAP * toolIndex, y: ROW_Y },
            data: {
              label: event.name ?? "tool",
              toolName: event.name,
              state: "thinking",
              summary: meta.runningSummary,
              detail: event.input
                ? `Input:\n${JSON.stringify(event.input, null, 2)}`
                : "Running…",
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

          patchNode(id, {
            state: get().erpNodeId === id ? "resolved" : meta.finalState,
            summary:
              get().erpNodeId === id
                ? "Delay complete — urge passed"
                : meta.summary,
            detail: formatDetail(input, event.output),
            payload: event.output,
            distortion,
          });
          break;
        }
        case "erp_await": {
          // The agent is paused waiting for the human to sit with the urge.
          const id = lastNodeId;
          set({ erpNodeId: id, erpAwaiting: true, selectedNodeId: id });
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
          });
          set({ finalResponse: event.response ?? "", status: "done" });
          break;
        }
        case "error": {
          patchNode(rootId, {
            state: "pending",
            summary: "Agent unavailable",
            detail: event.error ?? "Unknown error",
          });
          set({ status: "done", error: event.error ?? "Agent unavailable" });
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
          baselineRules: get().baselineRules,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error(`Agent request failed (${res.status})`);
      }

      // Parse the SSE stream (data: {json}\n\n frames).
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
          const line = frame
            .split("\n")
            .find((l) => l.startsWith("data:"));
          if (!line) continue;
          try {
            handle(JSON.parse(line.slice(5).trim()) as AgentEvent);
          } catch {
            // ignore malformed frame
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
