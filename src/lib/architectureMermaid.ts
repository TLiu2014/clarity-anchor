/**
 * Source of truth for the architecture diagram, rendered live on /docs.
 * Keep in sync with docs/architecture.mmd and the fenced block in README.md.
 */
export const ARCHITECTURE_MERMAID = `flowchart TD
    subgraph Browser["Browser · Next.js"]
        UI["Chat + React Flow map + Zustand"]
        Anchors["Your anchors<br/>(localStorage)"]
    end

    subgraph API["Next.js API · Node"]
        Route["/api/agent<br/>SSE stream"]
        Resume["/api/agent/resume"]
        Agent["AWS Strands Agent<br/>model-driven loop · sequential tools"]
        Tools["Tools:<br/>fetchBaselineRules · analyzeDistortion · requestErpDelay"]
    end

    Model["Amazon Bedrock — Claude<br/>(or built-in heuristic model)"]
    AgentCore["Amazon Bedrock AgentCore Runtime<br/>(same agent, packaged · /ping + /invocations)"]

    UI -- "POST urge + anchors" --> Route
    Anchors -. "sent with request" .-> Route
    Route --> Agent
    Agent -- "invoke" --> Model
    Agent -- "calls" --> Tools
    Agent -- "SSE: tool_start / tool_complete / done" --> UI
    Tools -. "requestErpDelay pauses the loop" .-> UI
    UI -- "user confirms" --> Resume
    Resume -. "resume the paused loop" .-> Agent
    Agent -. "also deployable to" .-> AgentCore
    AgentCore -- "invoke" --> Model
`;
