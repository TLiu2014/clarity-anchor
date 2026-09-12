import { commitErpCommit } from "@/lib/strands/erpRegistry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Resumes an agent run that is paused on an ERP delay. Called when the user
 * clicks "Commit to Delay" (or the drawer countdown finishes). Resolves the
 * server-side waiter so the requestErpDelay tool returns and the agent loop
 * continues streaming.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const runId: string | undefined =
    typeof body?.runId === "string" ? body.runId : undefined;

  if (!runId) {
    return Response.json({ error: "runId is required" }, { status: 400 });
  }

  const resumed = commitErpCommit(runId);
  return Response.json({ ok: true, resumed });
}
