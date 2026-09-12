import { Agent, BedrockModel, tool, type Model } from "@strands-agents/sdk";
import { z } from "zod";
import { MockModel } from "./mockModel";
import { demoDelay } from "./timing";
import { DEFAULT_BASELINE_RULES } from "./defaults";

export { DEFAULT_BASELINE_RULES };

/* -------------------------------------------------------------------------- */
/*  Distortion analysis                                                        */
/* -------------------------------------------------------------------------- */

const DISTORTIONS: {
  key: string;
  name: string;
  match: RegExp;
  explanation: string;
}[] = [
  {
    key: "contamination",
    name: "Magnification (Contamination fear)",
    match: /\b(germ|dirty|contamin|filth|wash|clean|touch|sick|disease)\w*/i,
    explanation:
      "Treating an ordinary contact as an overwhelming threat, inflating a low-probability risk into a certainty.",
  },
  {
    key: "checking",
    name: "Intolerance of Uncertainty (Checking/Doubt)",
    match: /\b(lock|stove|door|oven|check|sure|off|unplug|forgot|again)\w*/i,
    explanation:
      "Demanding 100% certainty and re-checking, when a single confirmation is already complete evidence.",
  },
  {
    key: "catastrophizing",
    name: "Catastrophizing",
    match: /\b(what if|disaster|terrible|die|death|worst|catastroph|ruin|never)\w*/i,
    explanation:
      "Jumping to the worst-case outcome and treating it as the likely one.",
  },
];

/* -------------------------------------------------------------------------- */
/*  Tool factory (per-run, closes over saved rules + the ERP pause hook)       */
/* -------------------------------------------------------------------------- */

export interface RealityAnchorOptions {
  /** The user's saved Calm Ground Rules (falls back to defaults if empty). */
  baselineRules?: string[];
  /**
   * Called by requestErpDelay to pause the agent loop for the human ERP delay.
   * The tool awaits this promise; the loop resumes only when it resolves.
   */
  onErpDelay?: (input: { trigger: string; urgeIntensity?: number }) => Promise<unknown>;
}

function buildTools(options: RealityAnchorOptions) {
  const rules =
    options.baselineRules && options.baselineRules.length > 0
      ? options.baselineRules
      : DEFAULT_BASELINE_RULES;

  const fetchBaselineRules = tool({
    name: "fetchBaselineRules",
    description:
      "Fetch the user's pre-agreed objective 'Calm Ground Rules'. Call this FIRST to ground any urge in the user's own baseline before judging it.",
    inputSchema: z.object({}),
    callback: async () => {
      await demoDelay();
      return {
        rules,
        source:
          options.baselineRules && options.baselineRules.length > 0
            ? "User's saved Calm Ground Rules."
            : "Default Calm Ground Rules (user hasn't set their own yet).",
      };
    },
  });

  const analyzeDistortion = tool({
    name: "analyzeDistortion",
    description:
      "Analyze the user's trigger text for a cognitive distortion (e.g. catastrophizing, intolerance of uncertainty, magnification). Use when the urge may be driven by a thinking trap rather than real evidence.",
    inputSchema: z.object({
      trigger: z
        .string()
        .describe("The user's reported trigger or intrusive urge, verbatim."),
    }),
    callback: async ({ trigger }) => {
      await demoDelay();
      const found =
        DISTORTIONS.find((d) => d.match.test(trigger)) ?? DISTORTIONS[2];
      return {
        distortion: found.name,
        confidence: found === DISTORTIONS[2] ? "moderate" : "high",
        explanation: found.explanation,
        counterEvidence:
          "The urge reports a feeling, not a new fact. Nothing objective has changed since your baseline was true.",
      };
    },
  });

  const requestErpDelay = tool({
    name: "requestErpDelay",
    description:
      "Invoke when the urge feels compulsive or is a gray area. Recommends an Exposure & Response Prevention delay: the user sits with the urge before acting. This PAUSES the agent until the user commits to the delay.",
    inputSchema: z.object({
      trigger: z.string().describe("The user's reported urge."),
      urgeIntensity: z
        .number()
        .min(0)
        .max(10)
        .optional()
        .describe("Optional 0–10 estimate of how strong the urge feels."),
    }),
    callback: async ({ trigger, urgeIntensity }) => {
      // Human-in-the-loop: block the agent loop until the user commits.
      const outcome = await options.onErpDelay?.({ trigger, urgeIntensity });
      return {
        action: "delay",
        minutes: 5,
        urgeIntensity: urgeIntensity ?? null,
        committed: outcome ?? "committed",
        script:
          "You held the delay. Notice the anxiety has already begun to fall on its own. You did not need the compulsion — the urge passed without it.",
        rationale:
          "Compulsions relieve anxiety briefly but teach the brain the danger was real. Delaying breaks that loop.",
      };
    },
  });

  return [fetchBaselineRules, analyzeDistortion, requestErpDelay];
}

/* -------------------------------------------------------------------------- */
/*  Agent                                                                      */
/* -------------------------------------------------------------------------- */

const SYSTEM_PROMPT = `You are ClarityAnchor, an objective "Reality Anchor" for a person experiencing OCD urges or anxious cognitive loops. Your job is to ground them in reality, never to reassure compulsively.

Follow this process for every reported trigger or urge:
1. Call fetchBaselineRules FIRST to load the user's agreed objective "Calm Ground Rules".
2. Compare the user's prompt to those rules. If it already violates a rule, say so plainly.
3. If the urge seems driven by a thinking trap rather than evidence, call analyzeDistortion to name the distortion.
4. If the urge is compulsive or a gray area, call requestErpDelay and relay the delay. This pauses for the user to sit with the urge.
5. Give a calm, brief, warm final answer: name the objective reality, and recommend acknowledging the thought WITHOUT performing the compulsion.

Never encourage the compulsion. Be concise and non-judgmental.`;

/**
 * Build a fresh Reality Anchor agent. Uses Amazon Bedrock when
 * `USE_BEDROCK=true` and AWS creds are configured; otherwise the
 * credential-free MockModel that scripts the same tool flow.
 */
export function createRealityAnchorAgent(options: RealityAnchorOptions = {}) {
  const useBedrock = process.env.USE_BEDROCK === "true";
  const model: Model = useBedrock
    ? new BedrockModel({
        modelId:
          process.env.BEDROCK_MODEL_ID ?? "global.anthropic.claude-sonnet-4-6",
        region: process.env.AWS_REGION ?? "us-east-1",
      })
    : new MockModel();

  return new Agent({
    model,
    systemPrompt: SYSTEM_PROMPT,
    tools: buildTools(options),
  });
}
