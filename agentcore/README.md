# ClarityAnchor on Amazon Bedrock AgentCore Runtime

This is a standalone deployable of ClarityAnchor's **Strands agent**, packaged for
[Amazon Bedrock AgentCore Runtime](https://strandsagents.com/docs/user-guide/deploy/deploy_to_bedrock_agentcore/typescript/)
— a serverless, session-isolated runtime for agents. It's separate from the
Next.js app (in `../`), which is untouched.

It exposes the AgentCore contract: `GET /ping` and `POST /invocations` on port
8080, wrapping the same three tools (`fetchBaselineRules`, `analyzeDistortion`,
`requestErpDelay`) and Bedrock model as the web app.

## Scope
This is the **request/response** variant AgentCore uses: it returns the grounding
answer plus the tool trace as JSON. The live SSE streaming and the interactive
human-in-the-loop ERP pause remain in the Next.js app (they rely on a held-open
stream); here `requestErpDelay` returns its recommendation inline.

## Prerequisites
- AWS CLI v2 (authenticated) and Docker with `buildx` (arm64).
- Amazon Bedrock model access enabled for Claude in your region.
- `AWS_REGION` set (default `us-west-2`).

## Deploy
```bash
cd agentcore

# 1) One-time: create the execution role → prints ROLE_ARN
./create-iam-role.sh
export ROLE_ARN=arn:aws:iam::<account>:role/clarityanchor-agentcore-role

# 2) Build (arm64), push to ECR, and create the AgentCore Runtime
./deploy.sh

# 3) Get the runtime ARN
aws bedrock-agentcore-control get-agent-runtime \
  --agent-runtime-name clarityanchor --region "$AWS_REGION"
```

## Invoke
With the AWS SDK (`@aws-sdk/client-bedrock-agentcore`):
```ts
import { BedrockAgentCoreClient, InvokeAgentRuntimeCommand } from "@aws-sdk/client-bedrock-agentcore";

const client = new BedrockAgentCoreClient({ region: process.env.AWS_REGION });
const out = await client.send(new InvokeAgentRuntimeCommand({
  agentRuntimeArn: process.env.AGENT_RUNTIME_ARN,
  runtimeSessionId: conversationId,               // one microVM/session per conversation
  qualifier: "DEFAULT",
  payload: new TextEncoder().encode(JSON.stringify({ prompt, baselineRules })),
}));
const body = JSON.parse(new TextDecoder().decode(out.response)); // { response, steps, stopReason }
```

## Local test (optional)
```bash
npm install && npm run build && AWS_REGION=us-west-2 npm start
curl -s localhost:8080/ping
curl -s -XPOST localhost:8080/invocations -d '{"prompt":"I keep needing to check the stove."}'
```
(Local runs need AWS credentials in the environment for Bedrock.)

## Optionally wiring the Next.js app to it
Point `POST /api/agent` at this runtime instead of the in-process agent by calling
`InvokeAgentRuntime` (above) with `runtimeSessionId = conversationId`. Note you'd
lose live streaming / the interactive pause on that path unless you also adopt
AgentCore streaming + a session-based resume — so the app currently keeps its
in-process agent, and this deployment is the AgentCore-hosted counterpart.
