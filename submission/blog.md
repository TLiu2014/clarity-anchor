# Building ClarityAnchor for Agents for Humans: an AI "Reality Anchor" that knows when *not* to act

*Built for the AWS **Agents for Humans** hackathon (Everyday Agents track), on
AWS Strands Agents + Amazon Bedrock.*

<!-- IMAGE 1 (hero) -->

## The problem: reassurance is the trap

Roughly one to two in a hundred people live with OCD, and many more with everyday
anxiety. The loop is cruel and familiar: an intrusive urge shows up — *did I lock
the door? are my hands clean? is the stove on?* — and the anxious brain demands
you act **right now**, exactly when you're least able to reason with it.

Most digital "help" offers reassurance on demand. But reassurance-on-demand is
the very fuel the compulsive loop runs on. The gold-standard therapy — Exposure &
Response Prevention (ERP) — does the opposite: it asks you to *sit with* the urge
without acting, until it eases on its own.

So I didn't want to build a chatbot that soothes. I wanted an agent that behaves
like a good therapist's voice in the room: it grounds you against reality, names
the trap you're caught in, and — crucially — knows the difference between a
compulsion to resist and a genuine signal to act on. An **anchor**, not a
comfort blanket.

## What ClarityAnchor does

You describe an intrusive urge, and a Strands agent on Amazon Bedrock works it
through a transparent, model-driven process:

1. **Loads your anchors** — objective facts you wrote while calm ("Checking the
   lock once is sufficient"; "I wash when my hands are actually dirty, not when
   they just feel dirty").
2. **Names the thinking trap** — the cognitive distortion at play, with an
   objective counter.
3. **Decides how to respond, per case** — and this is the whole point:
   - a gray-area **compulsion** → a **human-in-the-loop ERP pause**: the agent
     genuinely stops and hands control back to you for a timed delay;
   - an anchor that **decisively covers** it → resolve directly, no pause;
   - **genuine new evidence of risk** (you smell gas) → it does *not*
     pathologize it. It tells you to **act now**.

<!-- IMAGE 2 (diagnostic map) -->

Every step streams live over Server-Sent Events onto a React Flow "Diagnostic
Map," so nothing is a black box — you watch the agent reason.

## The architecture

<!-- IMAGE 3 (architecture diagram) -->

- **Agent** — AWS Strands Agents SDK (`@strands-agents/sdk`) drives a
  model-driven loop with three tools (Zod-typed): `fetchBaselineRules`,
  `analyzeDistortion`, `requestErpDelay`. Tools run sequentially so the UI can
  reveal each step.
- **Model** — Amazon Bedrock (Claude) in `us-west-2`, auto-detected from
  credentials. A credential-free mock model provides an offline heuristic
  fallback.
- **Streaming** — a Next.js API route runs the agent and emits every lifecycle
  event over SSE; the browser draws each as a node that goes blue (thinking) →
  green (resolved).
- **Deployment** — the same agent is packaged for **Amazon Bedrock AgentCore
  Runtime** (`/ping` + `/invocations`), and the web app ships as a standalone
  Docker image for EC2.

## The hard part: a pause that actually pauses

The signature feature is the ERP pause — and making it *real* was the most
interesting engineering problem. A confirm dialog is easy. Genuinely suspending a
live agent mid-loop and resuming it later is not, especially across Next.js API
routes that are bundled separately.

The trick: the `requestErpDelay` tool doesn't return immediately. It **awaits an
external signal** held in a `globalThis`-backed registry. The UI shows a
countdown; when you commit, `/api/agent/resume` resolves that signal, and the
agent loop continues to its grounded answer.

```ts
// requestErpDelay: the tool blocks the agent until the human resolves the pause
export const requestErpDelay = tool({
  name: "requestErpDelay",
  description: "Pause and sit with the urge before acting (ERP).",
  schema: z.object({ trigger: z.string(), urgeIntensity: z.number().optional() }),
  async handler({ trigger }) {
    const pause = registerErpPause();            // stored on globalThis
    await pause.promise;                          // ← agent genuinely waits here
    return `Delay complete for: ${trigger}`;
  },
});
```

<!-- IMAGE 4 (ERP pause / countdown) -->

That single `await` is the difference between a therapy-shaped feature and a
gimmick: the agent is *actually* sitting with you.

## Teaching an agent when **not** to intervene

The subtlest work was the prompt logic behind the three-way decision. The agent
must **default to the ERP pause** for compulsions, **auto-resolve** only when an
anchor clearly settles the situation, and **never** slow down a genuine safety
signal. Early versions over-paused; later ones auto-resolved too aggressively.
Getting the boundary right — *this smell of gas is new evidence, not a repeated
doubt* — is what makes the agent trustworthy.

<!-- IMAGE 5 (three-way comparison) -->

## What I learned

ERP's core insight — that *delaying* reassurance is the therapy — maps
surprisingly well onto agent design: sometimes the most valuable thing an agent
can do is **not** act. Human-in-the-loop is far more than a confirm dialog when
the "loop" is a live agent that must suspend and resume. And streaming the
reasoning as it happens builds trust in a way a final answer never can —
especially in a mental-health context, where a black box is worse than no tool.

## Try it

- **Live demo video:** https://youtu.be/R7gNbTCXNYY
- **Repo:** https://github.com/TLiu2014/clarity-anchor

ClarityAnchor is not a replacement for professional care — but it can be the
objective second voice in the room when the loop hits. That felt like the right
thing to build for *Agents for Humans*.
