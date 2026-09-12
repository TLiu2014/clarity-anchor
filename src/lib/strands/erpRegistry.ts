/**
 * In-memory coordination for the ERP (Exposure & Response Prevention) human-in-
 * the-loop pause.
 *
 * When the agent calls `requestErpDelay`, its tool callback awaits
 * `waitForErpCommit(runId)`. That await blocks the entire Strands agent loop
 * (the SSE stream goes quiet) until the user clicks "Commit to Delay" — which
 * hits /api/agent/resume and calls `commitErpCommit(runId)` to resolve the
 * promise, letting the loop continue.
 *
 * NOTE: this is process-local state. It works for a single Node instance (local
 * dev, a single container). A multi-instance/serverless deploy would need a
 * shared channel (Redis pub/sub, a durable queue, or the SDK's snapshot/resume).
 */

type Resolver = () => void;

interface Waiter {
  resolve: Resolver;
  timer?: ReturnType<typeof setTimeout>;
}

// Back the map on globalThis. In Next.js each route handler can be bundled into
// a separate module instance, so a plain module-level `const` would NOT be
// shared between /api/agent (which registers the waiter) and
// /api/agent/resume (which resolves it). A global singleton is.
const globalForErp = globalThis as unknown as {
  __erpWaiters?: Map<string, Waiter>;
};
const waiters: Map<string, Waiter> =
  globalForErp.__erpWaiters ?? (globalForErp.__erpWaiters = new Map());

/** Default safety cap so a forgotten pause can never hang the request forever. */
const MAX_WAIT_MS = 5 * 60 * 1000;

/**
 * Returns a promise that resolves when the run is committed (user action) or the
 * safety timeout elapses — whichever comes first.
 */
export function waitForErpCommit(
  runId: string,
  timeoutMs: number = MAX_WAIT_MS
): Promise<"committed" | "timeout"> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => {
      waiters.delete(runId);
      resolve("timeout");
    }, timeoutMs);

    waiters.set(runId, {
      resolve: () => {
        clearTimeout(timer);
        waiters.delete(runId);
        resolve("committed");
      },
      timer,
    });
  });
}

/** Resume a paused run. Returns false if there was no pending waiter. */
export function commitErpCommit(runId: string): boolean {
  const waiter = waiters.get(runId);
  if (!waiter) return false;
  waiter.resolve();
  return true;
}

/** Whether a run is currently paused awaiting a commit. */
export function isAwaitingErp(runId: string): boolean {
  return waiters.has(runId);
}
