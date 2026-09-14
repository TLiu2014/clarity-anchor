import {
  Agent,
  BedrockModel,
  tool,
  type Message,
  type MessageData,
  type Model,
} from "@strands-agents/sdk";
import { z } from "zod";
import { MockModel } from "./mockModel";
import { demoDelay } from "./timing";
import { DEFAULT_BASELINE_RULES } from "./defaults";

export { DEFAULT_BASELINE_RULES };

/** Bring-your-own-key Bedrock credentials sent from the client. */
export interface BedrockCreds {
  region?: string;
  apiKey?: string;
  accessKeyId?: string;
  secretAccessKey?: string;
  sessionToken?: string;
}

/** Does the credential set actually let us call Bedrock? */
export function hasBedrockCreds(creds?: BedrockCreds | null): boolean {
  if (!creds) return false;
  return Boolean(
    creds.apiKey?.trim() ||
      (creds.accessKeyId?.trim() && creds.secretAccessKey?.trim())
  );
}

/** Build a BedrockModel from BYOK credentials (or env/instance-role creds). */
export function buildBedrockModel(creds: BedrockCreds = {}): BedrockModel {
  const region = creds.region?.trim() || process.env.AWS_REGION || "us-west-2";
  const modelId =
    process.env.BEDROCK_MODEL_ID ?? "global.anthropic.claude-sonnet-4-6";

  if (creds.apiKey?.trim()) {
    return new BedrockModel({ modelId, region, apiKey: creds.apiKey.trim() });
  }
  if (creds.accessKeyId?.trim() && creds.secretAccessKey?.trim()) {
    return new BedrockModel({
      modelId,
      region,
      clientConfig: {
        region,
        credentials: {
          accessKeyId: creds.accessKeyId.trim(),
          secretAccessKey: creds.secretAccessKey.trim(),
          ...(creds.sessionToken?.trim()
            ? { sessionToken: creds.sessionToken.trim() }
            : {}),
        },
      },
    });
  }
  // Fall back to the ambient AWS credential chain (profile / SSO / role).
  return new BedrockModel({ modelId, region });
}

/** The credential-free heuristic (mock) model. */
export function createMockModel(): Model {
  return new MockModel();
}

/**
 * Whether the server env is set up to drive Bedrock (no BYOK needed):
 *  - MODEL_PROVIDER=bedrock            → yes (explicit)
 *  - MODEL_PROVIDER=mock               → no  (explicit opt-out)
 *  - otherwise auto-detect AWS creds   → yes if IAM keys or a Bedrock API key
 *    are present in the environment.
 */
export function envBedrockConfigured(): boolean {
  const p = process.env.MODEL_PROVIDER?.toLowerCase();
  if (p === "mock") return false;
  if (p === "bedrock") return true;
  return Boolean(
    (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) ||
      process.env.AWS_BEARER_TOKEN_BEDROCK
  );
}

/**
 * Default model when none is passed in: Amazon Bedrock when the env is set up
 * for it (AWS creds present, or MODEL_PROVIDER=bedrock), otherwise the built-in
 * credential-free heuristic model so the app still runs for a demo.
 */
function resolveModel(): Model {
  return envBedrockConfigured() ? buildBedrockModel() : createMockModel();
}

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
    key: "mindreading",
    name: "Mind-reading & Rumination",
    match: /\b(everyone|nobody|they think|thinks|replay|reviewing|conversation|said|judg|hate|embarrass|secretly|bad person)\w*/i,
    explanation:
      "Assuming you know what others think and mentally replaying events — treating guesses about the past as facts.",
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
  /** The model to drive. Defaults to the env-selected provider. */
  model?: Model;
  /** Prior conversation history to seed (for continuing a chat). */
  messages?: Message[] | MessageData[];
}

function buildTools(options: RealityAnchorOptions) {
  const rules =
    options.baselineRules && options.baselineRules.length > 0
      ? options.baselineRules
      : DEFAULT_BASELINE_RULES;

  const fetchBaselineRules = tool({
    name: "fetchBaselineRules",
    description:
      "Fetch the user's pre-agreed objective 'anchors' (calm baseline facts). Call this FIRST to ground any urge in the user's own anchors before judging it.",
    inputSchema: z.object({}),
    callback: async () => {
      await demoDelay();
      return {
        rules,
        source:
          options.baselineRules && options.baselineRules.length > 0
            ? "Your saved anchors."
            : "Default anchors (you haven't set your own yet).",
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
      "Recommend an Exposure & Response Prevention delay. Use this ONLY when there is a concrete PHYSICAL or BEHAVIORAL compulsion the user could perform right now — e.g. checking a lock/stove, washing/cleaning, counting, repeating, or re-doing an action. Do NOT use it for pure mental rumination, replaying conversations, or reassurance-seeking where there is no physical action to delay. This PAUSES the agent until the user commits to the delay.",
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

FIRST, decide whether this is a genuine new-evidence safety signal or an OCD urge. New, real sensory evidence — smelling gas, seeing smoke or fire, an actual injury or bleeding — is NOT the OCD loop. If it is genuine: after fetchBaselineRules, do NOT call analyzeDistortion or requestErpDelay; briefly validate it, tell the user to act on the real risk now and contact the appropriate help, and stop. Only treat something as an OCD urge when it is a repeated doubt with no new evidence.

For an OCD urge, follow this process:
1. Call fetchBaselineRules FIRST to load the user's agreed objective "anchors" (calm baseline facts).
2. Compare the user's prompt to those anchors. If it already violates one, say so plainly.
3. If the urge seems driven by a thinking trap rather than evidence, call analyzeDistortion to name the distortion.
4. Choose how to handle the compulsion. DEFAULT to the ERP pause; only skip it in the narrow case below.
   - HITL PAUSE (call requestErpDelay): whenever the urge is to REPEAT or re-do a physical action — check the lock or stove again, re-verify, wash after a real exposure — or is driven by a catastrophic "what if I didn't and something terrible happens". The compulsion to repeat is exactly what the delay treats, so pause even if an anchor logically says the action was already sufficient. When in doubt, pause.
   - AUTO-RESOLVE (no pause): ONLY when an anchor shows the action was never warranted in the first place — the situation simply does not meet the rule's condition (e.g. the rule is "wash only when hands are actually dirty" and the user's hands only FEEL dirty and look clean, with no real exposure). Then apply that anchor and answer directly; do NOT call requestErpDelay.
5. Give a calm, brief, warm final answer: name the objective reality, and recommend acknowledging the thought WITHOUT performing the compulsion.

Never encourage the compulsion. Be concise and non-judgmental.`;

/**
 * Build a fresh Reality Anchor agent. Uses Amazon Bedrock when
 * `USE_BEDROCK=true` and AWS creds are configured; otherwise the
 * credential-free MockModel that scripts the same tool flow.
 */
export function createRealityAnchorAgent(options: RealityAnchorOptions = {}) {
  return new Agent({
    model: options.model ?? resolveModel(),
    systemPrompt: SYSTEM_PROMPT,
    tools: buildTools(options),
    // Run tools one at a time so the frontend reveals each step as a guided
    // walkthrough (rules → thinking trap → pause), even when the model requests
    // several tools in one turn.
    toolExecutor: "sequential",
    ...(options.messages && options.messages.length > 0
      ? { messages: options.messages }
      : {}),
  });
}
