import {
  Model,
  type BaseModelConfig,
  type Message,
  type ModelStreamEvent,
  type StreamOptions,
} from "@strands-agents/sdk";
import { demoDelay } from "./timing";

/**
 * A dependency-free mock model provider for local development and the
 * hackathon demo. It requires no AWS/Bedrock credentials.
 *
 * It runs a deterministic, scripted version of the Strands agentic loop that
 * mirrors what a real model would do with the Reality Anchor tools:
 *   turn 0 → call fetchBaselineRules
 *   turn 1 → call analyzeDistortion({ trigger })
 *   turn 2 → call requestErpDelay({ trigger })
 *   turn 3 → final grounding answer, stop
 *
 * The turn is chosen by counting how many tool results are already in the
 * conversation, so the real Agent loop (tool selection → execution → next
 * turn) is exercised end-to-end without a hosted model.
 */
export class MockModel extends Model<BaseModelConfig> {
  private config: BaseModelConfig;

  constructor(config: BaseModelConfig = {}) {
    super();
    this.config = { modelId: "mock-reality-anchor", ...config };
  }

  updateConfig(modelConfig: BaseModelConfig): void {
    this.config = { ...this.config, ...modelConfig };
  }

  getConfig(): BaseModelConfig {
    return this.config;
  }

  /** How many tool results have been produced so far (drives the next step). */
  private toolResultCount(messages: Message[]): number {
    let n = 0;
    for (const m of messages) {
      for (const block of m.content ?? []) {
        if (block.type === "toolResultBlock") n += 1;
      }
    }
    return n;
  }

  /** The user's original trigger text (first user message). */
  private userTrigger(messages: Message[]): string {
    const firstUser = messages.find((m) => m.role === "user");
    const text = (firstUser?.content ?? [])
      .filter((b) => b.type === "textBlock")
      .map((b) => (b as unknown as { text: string }).text)
      .join(" ")
      .trim();
    return text || "the urge";
  }

  async *stream(
    messages: Message[],
    _options?: StreamOptions
  ): AsyncIterable<ModelStreamEvent> {
    const step = this.toolResultCount(messages);
    const trigger = this.userTrigger(messages);

    // Space model turns so tool_start events (and their nodes) stream in one
    // at a time rather than all at once.
    await demoDelay();

    switch (step) {
      case 0:
        yield* this.toolUseTurn("fetchBaselineRules", {}, "mock-tool-rules");
        break;
      case 1:
        yield* this.toolUseTurn(
          "analyzeDistortion",
          { trigger },
          "mock-tool-distortion"
        );
        break;
      case 2:
        // Only recommend an ERP delay for a physical compulsion / gray-area
        // urge. Pure rumination gets grounded without the pause — so different
        // urges produce visibly different flows.
        if (this.needsErpDelay(trigger)) {
          yield* this.toolUseTurn(
            "requestErpDelay",
            { trigger, urgeIntensity: 7 },
            "mock-tool-erp"
          );
        } else {
          yield* this.finalTurn();
        }
        break;
      default:
        yield* this.finalTurn();
        break;
    }
  }

  /** Heuristic: does this urge involve a physical compulsion worth delaying? */
  private needsErpDelay(trigger: string): boolean {
    return /\b(check|again|re-?check|wash|clean|lock|stove|oven|door|unplug|count|repeat|touch|scrub|hands|redo|verify|make sure)\w*/i.test(
      trigger
    );
  }

  private async *toolUseTurn(
    name: string,
    input: Record<string, unknown>,
    toolUseId: string
  ): AsyncGenerator<ModelStreamEvent> {
    yield { type: "modelMessageStartEvent", role: "assistant" };
    yield {
      type: "modelContentBlockStartEvent",
      start: { type: "toolUseStart", name, toolUseId },
    };
    yield {
      type: "modelContentBlockDeltaEvent",
      delta: { type: "toolUseInputDelta", input: JSON.stringify(input) },
    };
    yield { type: "modelContentBlockStopEvent" };
    yield { type: "modelMessageStopEvent", stopReason: "toolUse" };
  }

  private async *finalTurn(): AsyncGenerator<ModelStreamEvent> {
    const text =
      "Here's the reality: against your own anchors, nothing objective has changed — " +
      "this is a known OCD loop, not new evidence. The urge is a feeling, not a fact. " +
      "Acknowledge the thought, start a 5-minute ERP delay, and let the anxiety crest and fall " +
      "without acting on the compulsion. You've already done enough.";

    yield { type: "modelMessageStartEvent", role: "assistant" };
    yield { type: "modelContentBlockStartEvent" };
    yield {
      type: "modelContentBlockDeltaEvent",
      delta: { type: "textDelta", text },
    };
    yield { type: "modelContentBlockStopEvent" };
    yield { type: "modelMessageStopEvent", stopReason: "endTurn" };
  }
}
