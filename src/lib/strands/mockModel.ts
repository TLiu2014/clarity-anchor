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

    const kind = this.classify(trigger);

    // Genuine new-evidence / safety signal → ground, then validate + advise
    // action. No distortion, no ERP: a short flow (2 nodes) that shows the
    // agent won't pathologize a real risk.
    if (kind === "genuine") {
      if (step === 0) {
        yield* this.toolUseTurn("fetchBaselineRules", {}, "mock-tool-rules");
      } else {
        yield* this.finalTurn("genuine");
      }
      return;
    }

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
        if (kind === "hitl") {
          // Gray-area compulsion that persists despite the anchor → ERP pause
          // (4 nodes). The human sits with the urge.
          yield* this.toolUseTurn(
            "requestErpDelay",
            { trigger, urgeIntensity: 7 },
            "mock-tool-erp"
          );
        } else {
          // Auto: an anchor decisively covers the situation → resolve directly,
          // no pause (3 nodes).
          yield* this.finalTurn("auto");
        }
        break;
      default:
        yield* this.finalTurn("hitl");
        break;
    }
  }

  /**
   * Route the urge to one of three flows:
   *  - "genuine": real new sensory evidence of danger → act (2 nodes).
   *  - "hitl": gray-area compulsion with catastrophic doubt → ERP pause (4).
   *  - "auto": an anchor decisively covers it → resolve directly (3).
   */
  private classify(trigger: string): "genuine" | "hitl" | "auto" {
    if (
      /\b(smell|smoke|fire|burning|gas|flames?|bleeding|blood|injur|hurt|actually on|really is|new evidence)\w*/i.test(
        trigger
      )
    ) {
      return "genuine";
    }
    if (
      /\b(what if|burns? down|flood|catastroph|die|harm|lock|stove|oven|unplug|make sure|turn(ed)? off)\w*|check\b[^.?!]*\bagain/i.test(
        trigger
      )
    ) {
      return "hitl";
    }
    return "auto";
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

  private async *finalTurn(
    kind: "hitl" | "auto" | "genuine" = "hitl"
  ): AsyncGenerator<ModelStreamEvent> {
    const text =
      kind === "genuine"
        ? "This one is different — a gas smell is new, real evidence, not a repeated doubt, so it's not the OCD loop. " +
          "Act on it now: if it's safe, turn off the stove, open windows, and leave; then call your gas company or emergency services. " +
          "Take care of the real risk first. Once you're safe, we can look at whether anxiety is adding to it."
        : kind === "auto"
        ? "Your anchor settles this directly: you wash when your hands are actually dirty, not when they just feel dirty — and you said they look clean. " +
          "So there's nothing to wash here. This is the feeling of contamination, not real dirt; you can let it pass without acting."
        : "You held the delay — notice the urge is already easing. Against your own anchor, checking once is enough and nothing has changed. " +
          "This was the loop, not new evidence. Acknowledge the thought and let it go without checking again.";

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
