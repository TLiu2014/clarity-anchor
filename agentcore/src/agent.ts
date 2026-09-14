import { Agent, BedrockModel, tool } from "@strands-agents/sdk";
import { z } from "zod";

/**
 * ClarityAnchor's Strands agent, packaged for Amazon Bedrock AgentCore Runtime.
 *
 * This is the request/response variant used by AgentCore's /invocations endpoint:
 * it runs the same three tools and reasoning as the web app, but requestErpDelay
 * returns its recommendation immediately (no live human-in-the-loop pause — that
 * interactive flow lives in the Next.js app, which streams over SSE).
 */

export const DEFAULT_BASELINE_RULES = [
  "Only wash hands before eating or after using the bathroom.",
  "Checking the lock or stove once, and confirming it, is sufficient.",
  "A single verification is complete evidence; repeating adds no new information.",
  "Anxiety is a feeling, not proof of danger.",
];

const DISTORTIONS: { name: string; match: RegExp; explanation: string }[] = [
  {
    name: "Magnification (Contamination fear)",
    match: /\b(germ|dirty|contamin|filth|wash|clean|touch|sick|disease|scrub)\w*/i,
    explanation:
      "Treating an ordinary contact as an overwhelming threat, inflating a low-probability risk into a certainty.",
  },
  {
    name: "Intolerance of Uncertainty (Checking/Doubt)",
    match: /\b(lock|stove|door|oven|check|sure|off|unplug|forgot|again)\w*/i,
    explanation:
      "Demanding 100% certainty and re-checking, when a single confirmation is already complete evidence.",
  },
  {
    name: "Catastrophizing",
    match: /\b(what if|disaster|terrible|die|death|worst|catastroph|ruin|never)\w*/i,
    explanation:
      "Jumping to the worst-case outcome and treating it as the likely one.",
  },
];

const SYSTEM_PROMPT = `You are ClarityAnchor, an objective "Reality Anchor" for a person experiencing OCD urges or anxious cognitive loops. Ground them in reality; never reassure compulsively.

For every reported trigger or urge:
1. If it is a genuine new-evidence safety signal (smelling gas, smoke, an actual injury), do not treat it as OCD: validate it and tell the user to act on the real risk. Otherwise continue.
2. Call fetchBaselineRules to load the user's agreed "anchors".
3. If the urge is driven by a thinking trap, call analyzeDistortion to name it.
4. Call requestErpDelay for a physical compulsion to repeat an action (check/wash/verify again) or a catastrophic "what if"; skip it when an anchor shows the action was never warranted.
5. Give a calm, brief, warm answer grounded in the anchors, recommending the thought be acknowledged without performing the compulsion.

Be concise and non-judgmental.`;

export function createRealityAnchorAgent(baselineRules?: string[]) {
  const rules =
    baselineRules && baselineRules.length > 0
      ? baselineRules
      : DEFAULT_BASELINE_RULES;

  const fetchBaselineRules = tool({
    name: "fetchBaselineRules",
    description:
      "Fetch the user's pre-agreed objective 'anchors' (calm baseline facts). Call this FIRST.",
    inputSchema: z.object({}),
    callback: async () => ({ rules, source: "User's anchors." }),
  });

  const analyzeDistortion = tool({
    name: "analyzeDistortion",
    description:
      "Analyze the user's trigger for a cognitive distortion (catastrophizing, intolerance of uncertainty, magnification).",
    inputSchema: z.object({ trigger: z.string() }),
    callback: async ({ trigger }) => {
      const found =
        DISTORTIONS.find((d) => d.match.test(trigger)) ?? DISTORTIONS[2];
      return {
        distortion: found.name,
        explanation: found.explanation,
        counterEvidence:
          "The urge reports a feeling, not a new fact. Nothing objective has changed since the baseline was true.",
      };
    },
  });

  const requestErpDelay = tool({
    name: "requestErpDelay",
    description:
      "Recommend an Exposure & Response Prevention delay for a physical/behavioral compulsion.",
    inputSchema: z.object({
      trigger: z.string(),
      urgeIntensity: z.number().min(0).max(10).optional(),
    }),
    callback: async () => ({
      action: "delay",
      minutes: 5,
      script:
        "Wait 5 minutes before acting on the urge. Notice the anxiety rise and fall on its own; you are allowed to feel it without responding.",
      rationale:
        "Compulsions relieve anxiety briefly but teach the brain the danger was real. Delaying breaks the loop.",
    }),
  });

  return new Agent({
    model: new BedrockModel({
      modelId:
        process.env.BEDROCK_MODEL_ID ?? "global.anthropic.claude-sonnet-4-6",
      region: process.env.AWS_REGION ?? "us-west-2",
    }),
    systemPrompt: SYSTEM_PROMPT,
    tools: [fetchBaselineRules, analyzeDistortion, requestErpDelay],
    // AgentCore runs tools server-side; keep them sequential for clean traces.
    toolExecutor: "sequential",
  });
}
