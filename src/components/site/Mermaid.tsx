"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";

// Lazy-load mermaid so it never lands in the main bundle.
let mermaidPromise: Promise<typeof import("mermaid").default> | null = null;
function getMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((m) => m.default);
  }
  return mermaidPromise;
}

// mermaid holds global state; serialize renders through one chain.
let renderChain: Promise<unknown> = Promise.resolve();
let seq = 0;

/**
 * Renders a Mermaid diagram string to inline SVG, theme-aware (re-renders on
 * light/dark change). Falls back to a plain code block on parse errors.
 */
export function Mermaid({ chart }: { chart: string }) {
  const { resolvedTheme } = useTheme();
  const [svg, setSvg] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    const dark = resolvedTheme === "dark";
    renderChain = renderChain
      .catch(() => {})
      .then(async () => {
        try {
          const mermaid = await getMermaid();
          mermaid.initialize({
            startOnLoad: false,
            securityLevel: "strict",
            suppressErrorRendering: true,
            theme: dark ? "dark" : "default",
          });
          const id = `mmd-${Date.now()}-${seq++}`;
          await mermaid.parse(chart);
          const { svg } = await mermaid.render(id, chart);
          if (mounted.current) {
            setSvg(svg);
            setFailed(false);
          }
        } catch {
          if (mounted.current) setFailed(true);
        }
      });
  }, [chart, resolvedTheme]);

  if (failed) {
    return (
      <pre className="overflow-x-auto rounded-lg bg-slate-50 p-3 text-xs text-slate-600 dark:bg-slate-950 dark:text-slate-400">
        {chart}
      </pre>
    );
  }
  if (!svg) {
    return (
      <div className="flex h-40 items-center justify-center text-sm text-slate-400">
        Rendering diagram…
      </div>
    );
  }
  return (
    <div
      className="[&_svg]:mx-auto [&_svg]:h-auto [&_svg]:max-w-full"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
