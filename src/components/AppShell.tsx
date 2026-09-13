"use client";

import { Group, Panel, Separator } from "react-resizable-panels";
import { Header } from "@/components/Header";
import { DiagnosticMap } from "@/components/flow/DiagnosticMap";
import { ChatPanel } from "@/components/panels/ChatPanel";
import { RightPanel } from "@/components/panels/RightPanel";
import { NodeDetailsView } from "@/components/panels/NodeDetailsView";
import { useGraphStore } from "@/store/useGraphStore";

const COL_HANDLE =
  "w-1.5 shrink-0 cursor-col-resize bg-slate-200 outline-none transition-colors hover:bg-indigo-400 active:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500";
const ROW_HANDLE =
  "h-1.5 shrink-0 cursor-row-resize bg-slate-200 outline-none transition-colors hover:bg-indigo-400 active:bg-indigo-500 dark:bg-slate-800 dark:hover:bg-indigo-500";

export function AppShell() {
  const layoutMode = useGraphStore((s) => s.layoutMode);
  const centerSplit = useGraphStore((s) => s.centerSplit);

  // Intervention-first ("focus"): humanized details are the hero, map is a tab.
  // Explainability-first ("map"): the diagnostic map is the hero, details a tab.
  const center =
    layoutMode === "focus" ? (
      <div className="h-full w-full overflow-hidden bg-white dark:bg-slate-950">
        <NodeDetailsView />
      </div>
    ) : (
      <main className="relative z-0 h-full w-full bg-slate-50 dark:bg-slate-950">
        <DiagnosticMap />
      </main>
    );

  const stacked = centerSplit === "vertical";

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      <Header />
      <Group orientation="horizontal" className="flex min-h-0 flex-1">
        {/* Left: chat + live trace + suggestions */}
        <Panel id="chat" defaultSize="24" minSize="16" maxSize="40" className="min-w-0">
          <ChatPanel />
        </Panel>

        <Separator className={COL_HANDLE} />

        {/* Center + side: arranged side-by-side or stacked. */}
        <Panel id="main" minSize="40" className="min-h-0 min-w-0">
          <Group
            key={centerSplit}
            orientation={centerSplit}
            className={`flex h-full w-full min-h-0 min-w-0 ${
              stacked ? "flex-col" : "flex-row"
            }`}
          >
            <Panel id="center" minSize="25" className="min-h-0 min-w-0">
              {center}
            </Panel>

            <Separator className={stacked ? ROW_HANDLE : COL_HANDLE} />

            <Panel
              id="side"
              defaultSize={stacked ? "42" : "38"}
              minSize="20"
              maxSize="65"
              className="min-h-0 min-w-0"
            >
              <RightPanel />
            </Panel>
          </Group>
        </Panel>
      </Group>
    </div>
  );
}
