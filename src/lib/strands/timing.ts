/**
 * Demo pacing. The mock model resolves instantly, which would make the SSE
 * stream fire every event in the same millisecond and defeat the live
 * "chain-of-thought" visualization. A small, env-tunable delay spaces tool
 * calls out so each ThoughtNode is visibly born (blue) and then resolved
 * (green). Set DEMO_LATENCY_MS=0 for real Bedrock runs where latency is real.
 */
export const DEMO_DELAY_MS = Number.parseInt(
  process.env.DEMO_LATENCY_MS ?? "650",
  10
);

export function sleep(ms: number): Promise<void> {
  if (!ms || ms <= 0) return Promise.resolve();
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Convenience: pause for the configured demo delay (no-op when 0). */
export const demoDelay = () => sleep(DEMO_DELAY_MS);
