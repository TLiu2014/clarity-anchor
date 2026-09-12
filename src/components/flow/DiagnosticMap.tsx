"use client";

import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
  type NodeTypes,
} from "@xyflow/react";
import { useGraphStore } from "@/store/useGraphStore";
import { ResultPanel } from "@/components/ResultPanel";
import { STATE_STYLES } from "./stateStyles";
import { ThoughtNode } from "./ThoughtNode";

// Defined at module scope so React Flow doesn't re-register node types each render.
const nodeTypes: NodeTypes = { thought: ThoughtNode };

function DiagnosticMapInner() {
  const nodes = useGraphStore((s) => s.nodes);
  const edges = useGraphStore((s) => s.edges);
  const onNodesChange = useGraphStore((s) => s.onNodesChange);
  const onEdgesChange = useGraphStore((s) => s.onEdgesChange);
  const onConnect = useGraphStore((s) => s.onConnect);
  const openDetails = useGraphStore((s) => s.openDetails);
  const status = useGraphStore((s) => s.status);
  const selectedNodeId = useGraphStore((s) => s.selectedNodeId);
  const rf = useReactFlow();

  // Re-fit the viewport as nodes stream in so new nodes are always visible and
  // the layout stays centered.
  const nodeCount = nodes.length;
  useEffect(() => {
    if (nodeCount === 0) return;
    const t = setTimeout(
      () => rf.fitView({ padding: 0.25, duration: 400, maxZoom: 1.3 }),
      70
    );
    return () => clearTimeout(t);
  }, [nodeCount, rf]);

  const decorated = useMemo(
    () =>
      nodes.map((n) => ({
        ...n,
        selected: n.id === selectedNodeId,
      })),
    [nodes, selectedNodeId]
  );

  return (
    <div className="relative h-full w-full">
      <ReactFlow
        nodes={decorated}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={(_, node) => openDetails(node.id)}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.3, minZoom: 0.5, maxZoom: 1.3 }}
        proOptions={{ hideAttribution: true }}
        className="h-full w-full"
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={18}
          size={1}
          className="!text-slate-300 dark:!text-slate-700"
          color="currentColor"
        />
        <Controls className="!rounded-lg !border !border-slate-200 !shadow-md dark:!border-slate-700" />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const state = (n.data as { state?: keyof typeof STATE_STYLES })
              ?.state;
            return state ? STATE_STYLES[state].color : "#9ca3af";
          }}
          className="!rounded-lg !bg-white/90 dark:!bg-slate-900/90"
        />
      </ReactFlow>

      {nodes.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="max-w-sm text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-100 text-indigo-600 dark:bg-indigo-950 dark:text-indigo-300">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-7 w-7">
                <circle cx="12" cy="5" r="2.5" />
                <path d="M12 7.5V21M5 13a7 7 0 0 0 14 0M4 13h2M18 13h2" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">
              Your Diagnostic Map is clear
            </h2>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              Describe the trigger or urge you&apos;re experiencing above and
              press <span className="font-medium">Analyze Urge</span>. The
              Reality Anchor agent will map its reasoning here as it works.
            </p>
          </div>
        </div>
      )}

      {status === "running" && (
        <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 rounded-full bg-blue-600/90 px-3 py-1 text-xs font-medium text-white shadow">
          Agent is reasoning…
        </div>
      )}

      <ResultPanel />
    </div>
  );
}

export function DiagnosticMap() {
  return (
    <ReactFlowProvider>
      <DiagnosticMapInner />
    </ReactFlowProvider>
  );
}
