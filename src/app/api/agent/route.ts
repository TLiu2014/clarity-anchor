import { createRealityAnchorAgent } from "@/lib/strands/agent";
import { waitForErpCommit } from "@/lib/strands/erpRegistry";

// The Strands SDK is Node-only (pulls in AWS SDK, etc.). Force the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Reduce a toolResult content array to a plain JS value (json block or joined text). */
function reduceToolResult(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  for (const c of content) {
    if (c && typeof c === "object" && "json" in c) {
      return (c as { json: unknown }).json;
    }
  }
  const texts = content
    .filter((c) => c && typeof c === "object" && "text" in c)
    .map((c) => (c as { text: string }).text);
  return texts.length ? texts.join("\n") : content;
}

/**
 * Streams the ClarityAnchor Strands agent's chain-of-thought as Server-Sent
 * Events. It iterates the agent's lifecycle stream and forwards a JSON chunk on
 * each meaningful event so the frontend can draw the Diagnostic Map live:
 *
 *   { type: "start",         prompt }
 *   { type: "tool_start",    name, toolUseId, input }
 *   { type: "tool_complete", name, toolUseId, output }
 *   { type: "done",          response, stopReason }
 *   { type: "error",         error }
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt: string =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "I feel like I have to check the front door lock again.";
  const runId: string =
    typeof body?.runId === "string" && body.runId ? body.runId : "default-run";
  const baselineRules: string[] = Array.isArray(body?.baselineRules)
    ? body.baselineRules.filter(
        (r: unknown): r is string => typeof r === "string" && r.trim().length > 0
      )
    : [];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));
      };

      try {
        send({ type: "start", prompt, runId });

        const agent = createRealityAnchorAgent({
          baselineRules,
          onErpDelay: async (input) => {
            // Tell the client we're paused, then block the loop until commit.
            send({ type: "erp_await", runId, input });
            const outcome = await waitForErpCommit(runId);
            send({ type: "erp_resume", runId, outcome });
            return outcome;
          },
        });

        for await (const streamEvent of agent.stream(prompt)) {
          // The stream is typed as the StreamEvent base class; narrow loosely.
          const event = streamEvent as unknown as {
            type: string;
            toolUse?: { name?: string; toolUseId?: string; input?: unknown };
            result?: {
              content?: unknown;
              toString?: () => string;
              stopReason?: string;
            };
          };

          switch (event.type) {
            case "beforeToolCallEvent": {
              const tu = event.toolUse;
              send({
                type: "tool_start",
                name: tu?.name,
                toolUseId: tu?.toolUseId,
                input: tu?.input,
              });
              break;
            }
            case "afterToolCallEvent": {
              const tu = event.toolUse;
              send({
                type: "tool_complete",
                name: tu?.name,
                toolUseId: tu?.toolUseId,
                output: reduceToolResult(event.result?.content),
              });
              break;
            }
            case "agentResultEvent": {
              send({
                type: "done",
                response: event.result?.toString?.() ?? "",
                stopReason: event.result?.stopReason,
              });
              break;
            }
            default:
              break;
          }
        }
      } catch (err) {
        console.error("[/api/agent] stream error", err);
        send({
          type: "error",
          error: err instanceof Error ? err.message : "Agent invocation failed",
        });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      // Disable proxy buffering (e.g. nginx) so chunks flush immediately.
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return Response.json({
    status: "ok",
    agent: "ClarityAnchor Reality Anchor (SSE)",
    model: process.env.USE_BEDROCK === "true" ? "bedrock" : "mock",
    tools: ["fetchBaselineRules", "analyzeDistortion", "requestErpDelay"],
    hint: "POST { prompt } to stream the agent's chain-of-thought as SSE.",
  });
}
