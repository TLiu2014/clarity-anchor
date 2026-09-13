import {
  buildBedrockModel,
  createMockModel,
  createRealityAnchorAgent,
  envBedrockConfigured,
  hasBedrockCreds,
  type BedrockCreds,
} from "@/lib/strands/agent";
import { waitForErpCommit } from "@/lib/strands/erpRegistry";
import { getHistory, saveHistory } from "@/lib/strands/conversationStore";
import type { Model } from "@strands-agents/sdk";

// The Strands SDK is Node-only (pulls in AWS SDK, etc.). Force the Node runtime.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
 * Streams the ClarityAnchor Strands agent's chain-of-thought as SSE.
 *
 * Model selection:
 *  - BYOK Bedrock credentials in the request  → real LLM (Amazon Bedrock)
 *  - else MODEL_PROVIDER=bedrock in the env    → real LLM (ambient AWS creds)
 *  - else fallbackMode="heuristic"             → credential-free mock model
 *  - else fallbackMode="alert"                 → emit a not_connected error
 *
 * Conversation continuity: prior messages for `conversationId` seed the agent
 * (real models only), and the updated history is saved back after the run.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const prompt: string =
    typeof body?.prompt === "string" && body.prompt.trim()
      ? body.prompt.trim()
      : "I feel like I have to check the front door lock again.";
  const runId: string =
    typeof body?.runId === "string" && body.runId ? body.runId : "default-run";
  const conversationId: string | undefined =
    typeof body?.conversationId === "string" ? body.conversationId : undefined;
  const baselineRules: string[] = Array.isArray(body?.baselineRules)
    ? body.baselineRules.filter(
        (r: unknown): r is string => typeof r === "string" && r.trim().length > 0
      )
    : [];
  const fallbackMode: "heuristic" | "alert" =
    body?.fallbackMode === "alert" ? "alert" : "heuristic";
  const bedrock: BedrockCreds | null =
    body?.bedrock && typeof body.bedrock === "object" ? body.bedrock : null;

  // Decide the model.
  let model: Model | null = null;
  let usingRealModel = false;
  if (hasBedrockCreds(bedrock)) {
    model = buildBedrockModel(bedrock!);
    usingRealModel = true;
  } else if (envBedrockConfigured()) {
    model = buildBedrockModel();
    usingRealModel = true;
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) =>
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(obj)}\n\n`));

      try {
        send({ type: "start", prompt, runId });

        // No real model available → alert or heuristic fallback.
        if (!model) {
          if (fallbackMode === "alert") {
            send({
              type: "error",
              code: "not_connected",
              error:
                "Agent not connected. Add your Bedrock API key in Settings, or switch the fallback to Heuristic mode.",
            });
            return;
          }
          model = createMockModel();
        }

        const agent = createRealityAnchorAgent({
          baselineRules,
          model,
          // Only real models benefit from (and correctly handle) prior history.
          messages: usingRealModel ? getHistory(conversationId) : [],
          onErpDelay: async (input) => {
            send({ type: "erp_await", runId, input });
            const outcome = await waitForErpCommit(runId);
            send({ type: "erp_resume", runId, outcome });
            return outcome;
          },
        });

        for await (const streamEvent of agent.stream(prompt)) {
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
            case "beforeToolCallEvent":
              send({
                type: "tool_start",
                name: event.toolUse?.name,
                toolUseId: event.toolUse?.toolUseId,
                input: event.toolUse?.input,
              });
              break;
            case "afterToolCallEvent":
              send({
                type: "tool_complete",
                name: event.toolUse?.name,
                toolUseId: event.toolUse?.toolUseId,
                output: reduceToolResult(event.result?.content),
              });
              break;
            case "agentResultEvent":
              send({
                type: "done",
                response: event.result?.toString?.() ?? "",
                stopReason: event.result?.stopReason,
              });
              break;
            default:
              break;
          }
        }

        // Persist updated history so the next turn continues the conversation.
        if (usingRealModel) {
          saveHistory(conversationId, agent.messages);
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
      "X-Accel-Buffering": "no",
    },
  });
}

export async function GET() {
  return Response.json({
    status: "ok",
    agent: "ClarityAnchor Reality Anchor (SSE)",
    defaultModel: envBedrockConfigured() ? "bedrock" : "mock",
    tools: ["fetchBaselineRules", "analyzeDistortion", "requestErpDelay"],
    hint: "POST { prompt, conversationId, bedrock?, fallbackMode? } to stream.",
  });
}
