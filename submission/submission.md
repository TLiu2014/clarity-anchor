# ClarityAnchor — About the project

## Inspiration

Roughly one to two in a hundred people live with OCD, and many more live with
everyday anxiety. The pattern is cruel: an intrusive urge shows up — *did I lock
the door? are my hands clean? is the stove on?* — and the anxious brain insists
you act **right now**, exactly when you're least able to argue back. The usual
digital "help" is reassurance on demand, which is precisely the fuel the
compulsive loop runs on.

The gold-standard therapy, Exposure & Response Prevention (ERP), does the
opposite: it asks you to *sit with* the urge without acting, until it eases. We
wanted an AI agent that behaves like a good therapist's voice in the room — one
that grounds you against reality, names the trap you're caught in, and knows the
difference between a compulsion to resist and a genuine signal to act on. Not a
chatbot that soothes, but an **anchor**.

## What it does

ClarityAnchor is an AI "Reality Anchor" for OCD and anxiety. You describe an
intrusive urge, and a **Strands agent on Amazon Bedrock** works it through a
transparent, model-driven process:

1. **Loads your anchors** — objective facts you wrote while calm (e.g. "Checking
   the lock once is sufficient", "I wash when my hands are actually dirty, not
   when they just feel dirty").
2. **Names the thinking trap** — the cognitive distortion at play (intolerance of
   uncertainty, magnification, and so on) with an objective counter.
3. **Decides how to respond — per case.** This is the point of the app:
   - For a gray-area **compulsion**, it triggers a **human-in-the-loop ERP
     pause**: the agent genuinely stops and hands control back to you, running a
     timed delay until you choose to continue.
   - When an anchor **decisively covers** the situation, it resolves directly —
     no pause needed.
   - When it detects **genuine new evidence of risk** (you smell gas, you're
     bleeding), it does *not* pathologize it — it tells you to **act now**.

Every step of the agent's chain-of-thought streams live over Server-Sent Events
onto a **React Flow "Diagnostic Map"**, so nothing is a black box — you watch it
reason. Your anchors persist locally, and it runs with zero setup via a built-in
heuristic fallback that walks the sample scenarios even without an AWS key.

## How we built it

- **Agent** — AWS Strands Agents SDK (`@strands-agents/sdk`) drives a
  model-driven loop with three tools defined via Zod schemas:
  `fetchBaselineRules`, `analyzeDistortion`, and `requestErpDelay`. Tools run
  sequentially so the UI can reveal each step as a guided walkthrough.
- **Model** — Amazon Bedrock (Claude) in `us-west-2`, auto-detected from
  environment credentials or a key pasted into the in-app settings. A
  credential-free `MockModel` subclass provides an offline heuristic fallback.
- **Streaming** — a Next.js API route runs the agent and emits every lifecycle
  event (`tool_start` / `tool_complete` / `done`) over SSE; the browser draws
  each as a node that goes blue (thinking) → green (resolved).
- **Human-in-the-loop** — the `requestErpDelay` tool *blocks* the agent loop and
  awaits a resolution kept in a `globalThis`-backed registry; the UI shows a
  countdown, and `/api/agent/resume` releases the loop to finish with a grounded
  answer.
- **Frontend** — Next.js (App Router) + React 19, React Flow (`@xyflow/react`)
  for the map, Zustand for state, Tailwind CSS + next-themes for styling.
- **Deployment** — the same Strands agent is packaged for **Amazon Bedrock
  AgentCore Runtime** (a standalone `/ping` + `/invocations` service), and the
  web app ships as a standalone Docker image for EC2 (local build → ECR pull,
  Bedrock reached via an IAM instance role, nginx tuned for SSE).

## Challenges we ran into

- **A real pause, without SDK snapshotting.** Pausing a running agent
  mid-loop and resuming it later — across separately bundled Next.js API routes —
  meant the ERP tool had to *await* an external signal held in a `globalThis`
  registry rather than relying on the SDK to serialize state.
- **Streaming a live agent honestly.** Mapping Strands lifecycle events to
  React Flow nodes in real time, and keeping the node-detail panel scrolled to
  the newest step with a smooth animation, took several iterations.
- **Teaching the agent *when not to intervene*.** The hardest prompt work was
  the three-way decision: default to the ERP pause for compulsions, auto-resolve
  only when an anchor clearly settles it, and **never** slow down a genuine
  safety signal. Early versions over-paused or auto-resolved too aggressively.
- **Small SDK gotchas** — stop reasons are camelCase (`toolUse` / `endTurn`);
  getting them wrong ended the agentic loop early in the mock model.
- **Standalone builds** — ensuring the Strands SDK and Bedrock runtime were
  traced into the `.next/standalone` output for the Docker image.

## Accomplishments that we're proud of

- A human-in-the-loop pause that is *actually therapeutic*, not cosmetic — the
  agent really stops and waits for you.
- An agent that knows the difference between a compulsion and a real risk, and
  gives **opposite** advice for each — that judgment is what makes it
  trustworthy.
- Full transparency: the entire chain-of-thought is visible, live, as a map.
- It runs three ways — real Bedrock, offline heuristic, and packaged for
  AgentCore Runtime — from the same agent code.

## What we learned

- ERP's core insight — that *delaying* reassurance is the therapy while
  reassurance-on-demand is the compulsion — maps surprisingly well onto agent
  design: the most valuable thing the agent can do is sometimes to **not** act.
- Human-in-the-loop is far more than a confirm dialog when the "loop" is a live
  agent that must genuinely suspend and resume.
- Streaming an agent's reasoning as it happens builds trust in a way a final
  answer never can — especially in a mental-health context where a black box is
  worse than no tool at all.

## What's next for ClarityAnchor

- **Personalized anchors over time** — learn and suggest anchors from a user's
  own history instead of manual entry.
- **Adaptive ERP** — tune delay length to urge intensity and past outcomes.
- **Deploy on Amazon Bedrock AgentCore Runtime** for real, with per-user session
  isolation, and add secure cloud sync for anchors.
- **Clinician mode** — optional, privacy-preserving summaries a therapist can
  review between sessions.
- Broaden beyond OCD to other anxiety loops, always keeping the "objective second
  voice, not a replacement for professional care" framing.
