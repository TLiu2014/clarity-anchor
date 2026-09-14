import express from "express";
import { createRealityAnchorAgent } from "./agent.js";

/**
 * Amazon Bedrock AgentCore Runtime contract: an HTTP service exposing
 *   GET  /ping         → health check
 *   POST /invocations  → run the agent on a binary payload, return JSON
 * on port 8080 (override with PORT).
 * See: https://strandsagents.com/docs/user-guide/deploy/deploy_to_bedrock_agentcore/typescript/
 */

const app = express();
const PORT = Number.parseInt(process.env.PORT ?? "8080", 10);

app.get("/ping", (_req, res) => {
  res.json({ status: "Healthy", time_of_last_update: Math.floor(Date.now() / 1000) });
});

interface ToolStep {
  name: string;
  input: unknown;
  output: unknown;
}

function reduceToolResult(content: unknown): unknown {
  if (!Array.isArray(content)) return content;
  for (const c of content) {
    if (c && typeof c === "object" && "json" in c) return (c as { json: unknown }).json;
  }
  const texts = content
    .filter((c) => c && typeof c === "object" && "text" in c)
    .map((c) => (c as { text: string }).text);
  return texts.length ? texts.join("\n") : content;
}

app.post("/invocations", express.raw({ type: "*/*", limit: "1mb" }), async (req, res) => {
  try {
    const raw = new TextDecoder().decode(req.body as Buffer);
    // Accept either a plain-text prompt or JSON { prompt, baselineRules }.
    let prompt = raw;
    let baselineRules: string[] | undefined;
    try {
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed === "object") {
        if (typeof parsed.prompt === "string") prompt = parsed.prompt;
        if (Array.isArray(parsed.baselineRules)) {
          baselineRules = parsed.baselineRules.filter(
            (r: unknown): r is string => typeof r === "string"
          );
        }
      }
    } catch {
      /* not JSON — treat the whole body as the prompt */
    }

    if (!prompt.trim()) {
      return res.status(400).json({ error: "Empty prompt." });
    }

    const agent = createRealityAnchorAgent(baselineRules);
    const result = await agent.invoke(prompt.trim());

    // Extract an ordered trace of tool calls (same shape the web app uses).
    const byId = new Map<string, ToolStep>();
    const order: string[] = [];
    for (const message of agent.messages) {
      for (const block of message.content ?? []) {
        const b = block as unknown as {
          type: string;
          name?: string;
          toolUseId?: string;
          input?: unknown;
          content?: unknown;
        };
        if (b.type === "toolUseBlock" && b.toolUseId) {
          byId.set(b.toolUseId, { name: b.name ?? "unknown", input: b.input, output: null });
          order.push(b.toolUseId);
        } else if (b.type === "toolResultBlock" && b.toolUseId) {
          const step = byId.get(b.toolUseId);
          if (step) step.output = reduceToolResult(b.content);
        }
      }
    }
    const steps = order.map((id) => byId.get(id)).filter(Boolean);

    return res.json({
      response: result.toString(),
      stopReason: result.stopReason,
      steps,
    });
  } catch (err) {
    console.error("[/invocations] error", err);
    return res
      .status(500)
      .json({ error: err instanceof Error ? err.message : "Agent invocation failed" });
  }
});

app.listen(PORT, () => {
  console.log(`ClarityAnchor AgentCore service listening on :${PORT}`);
});
