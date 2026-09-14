# Deploy the ClarityAnchor web app to EC2 (local Docker build → ECR)

You build the image **on your machine**, push it to **ECR**, and EC2 just runs it —
no AWS build service (CodeBuild/Amplify). Bedrock is reached via the instance's
**IAM role**, so no AWS keys live in the image.

## Prerequisites — AWS credentials on *your machine* (not in the image)

You need AWS credentials **locally** to (a) run the `aws` CLI commands below and
(b) push the Docker image to ECR. The **running container never uses access
keys** — on EC2 it gets Bedrock access from the instance role (Step 0), so no
secrets are baked into the image.

If you don't have `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` yet, create them
for an IAM user (needs an AWS account first):

1. AWS Console → **IAM** → **Users** → **Create user** (e.g.
   `clarityanchor-admin`). You only need programmatic access, not console sign-in.
2. Attach permissions. Simplest for a solo hackathon deploy — attach these
   AWS-managed policies (tighten later): `AmazonBedrockFullAccess`,
   `AmazonEC2ContainerRegistryFullAccess`, `IAMFullAccess`, `AmazonEC2FullAccess`.
3. Open the user → **Security credentials** → **Create access key** → choose
   **Command Line Interface (CLI)** → confirm. Copy the **Access key ID** and
   **Secret access key** now — the secret is shown **only once**.
4. Store them on your machine:
   ```bash
   aws configure
   # AWS Access Key ID:     <paste>
   # AWS Secret Access Key: <paste>
   # Default region name:   us-west-2
   # Default output format: json
   ```
   Verify with `aws sts get-caller-identity`.
5. **Enable Bedrock model access:** Console → **Amazon Bedrock** → **Model
   access** → enable **Claude** in `us-west-2` (one-time; can take a few minutes).

> Optional — test locally against real Bedrock: put the same two keys in
> `.env.local` as `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY`, plus
> `AWS_REGION=us-west-2` and `MODEL_PROVIDER=bedrock`, then `pnpm dev`. These
> stay on your machine and are **not** copied into the Docker image.

## 0. One-time AWS setup
- Enable Amazon Bedrock **model access** for Claude in your region.
- Create the EC2 **instance role** (grants Bedrock invoke + ECR pull):
  ```bash
  aws iam create-role --role-name clarityanchor-ec2 \
    --assume-role-policy-document file://deploy/iam/instance-trust-policy.json
  aws iam put-role-policy --role-name clarityanchor-ec2 \
    --policy-name clarityanchor-ec2-permissions \
    --policy-document file://deploy/iam/instance-policy.json
  aws iam create-instance-profile --instance-profile-name clarityanchor-ec2
  aws iam add-role-to-instance-profile \
    --instance-profile-name clarityanchor-ec2 --role-name clarityanchor-ec2
  ```
- Launch an EC2 instance (Amazon Linux 2023, e.g. `t3.micro` free-tier / x86_64),
  attach the `clarityanchor-ec2` instance profile, and open ports **80** and **22**
  (and **443** if you add TLS) in its security group.

## 1. Build + push the image (from your machine)
```bash
# x86_64 instance (t3/t2 default):
./deploy/build-and-push.sh
# Graviton (t4g) instead:
PLATFORM=linux/arm64 ./deploy/build-and-push.sh
# If your deploy keys are in a named profile:
AWS_PROFILE=<your-deploy-profile> ./deploy/build-and-push.sh
```
The script runs `pnpm build` **on your machine** to produce the Next standalone
output, then the Docker image only *packages* it (no `pnpm install`/build inside
the container). The image is pushed to `clarityanchor-web:latest` in ECR.

## 2. Run it on the EC2 host
SSH in, install Docker, then pull & run (creds come from the instance role):
```bash
sudo dnf install -y docker && sudo systemctl enable --now docker
REGION=us-west-2
ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
IMAGE=${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/clarityanchor-web:latest
aws ecr get-login-password --region $REGION | sudo docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com
sudo docker pull $IMAGE
sudo docker run -d --restart unless-stopped -p 3000:3000 \
  -e MODEL_PROVIDER=bedrock -e AWS_REGION=$REGION -e DEMO_LATENCY_MS=0 \
  --name clarityanchor $IMAGE
```
> `MODEL_PROVIDER=bedrock` is required: with an instance role there are no
> `AWS_ACCESS_KEY_ID` env vars for the app to auto-detect, so set it explicitly.
> The AWS SDK then picks up the role's credentials from instance metadata.

## 3. Front it with nginx (needed for the SSE / ERP pause)
```bash
sudo dnf install -y nginx
sudo cp deploy/nginx.conf /etc/nginx/conf.d/clarityanchor.conf
sudo nginx -t && sudo systemctl enable --now nginx && sudo systemctl reload nginx
```
The config disables proxy buffering and sets a long read timeout so the held-open
`/api/agent` stream (the ERP pause) isn't cut. Visit `http://<EC2-public-IP>/`.
(Optional TLS: point a domain at the IP and run `certbot --nginx`.)

## Updating
Re-run `./deploy/build-and-push.sh`, then on the host:
`sudo docker pull $IMAGE && sudo docker rm -f clarityanchor && <docker run … again>`.

## Deployment gotchas (why the build is set up this way)

If you touch the Dockerfile, `next.config.mjs`, or `build-and-push.sh`, read this
first.

Note the app is built **on the host** (`pnpm build`) and the `Dockerfile` is
**runtime-only** — it just packages the prebuilt `.next/standalone` and runs
`node server.js`; no `pnpm install`/build happens in the container.

### The externalized Strands SDK's runtime deps are missing from `standalone`

Symptom: pages load fine, but hitting `/api/agent` (running an analysis) 500s with
`ERR_MODULE_NOT_FOUND`, in a chain — `@modelcontextprotocol/sdk` →
`@aws-sdk/client-bedrock-runtime` → `@opentelemetry/api` → `cross-spawn` → …

Cause: `@strands-agents/sdk` is in `serverExternalPackages` (so Next doesn't bundle
it), and it **eagerly imports many integrations it declares as `peerDependencies`**
(MCP, the Bedrock client, OpenTelemetry, etc.). Because it's externalized, Next's
file tracer can't follow those imports, so they never land in `.next/standalone`.
Locally it works only because pnpm has those packages in the store. Note the app
**does not use MCP** at all — Strands just imports it unconditionally, which is why
`@modelcontextprotocol/sdk` shows up first. (`@modelcontextprotocol/sdk` isn't even
declared by Strands, so it must be installed explicitly: `pnpm add @modelcontextprotocol/sdk`.)

**Fix:** `deploy/copy-mcp-deps.mjs` runs after `pnpm build` and injects the Strands
runtime **dependency closure** into `.next/standalone/node_modules`. It BFS-resolves
packages from the real (pnpm) `node_modules` starting at Strands — following
`dependencies` + `optionalDependencies` + `peerDependencies`, and skipping peers
that aren't installed (those aren't on any loadable path anyway). This keeps the
image lean (~127 MB vs ~576 MB for a full prod `node_modules`, which is mostly
unused `@aws-sdk`).

Two subtleties the script handles:
- **Trace globs don't reach pnpm transitives.** `outputFileTracingIncludes` globs
  like `./node_modules/@aws-sdk/**` only match *top-level* packages; Strands'
  transitive deps live under `.pnpm/…` and aren't matched. Tracing the whole
  `node_modules` instead overflows the tracer on pnpm's symlink graph
  (`Maximum call stack size exceeded`). Hence the explicit closure copy.
- **Walk up to the package *root*.** A package's `./package.json` export can resolve
  to a nested `dist/cjs/package.json` type-marker (`{"type":"commonjs"}`) that has
  no `dependencies` — reading that silently drops the whole subtree. The script
  walks up to the manifest whose `name` matches before reading deps.

If you add a Strands feature that pulls in a new integration, install that package
and it'll be picked up automatically (it's declared as a Strands peer dep).

## Alternative: deploy the agent to Amazon Bedrock AgentCore Runtime

The same Strands agent is also packaged for **Amazon Bedrock AgentCore Runtime**
(serverless, session-isolated agent hosting) in [`../agentcore/`](../agentcore/) —
a standalone Express service exposing the AgentCore contract (`GET /ping`,
`POST /invocations`). Build the arm64 image, push to ECR, and create the runtime:

```bash
cd agentcore
./create-iam-role.sh          # one-time: execution role → prints ROLE_ARN
export ROLE_ARN=...
./deploy.sh                   # ECR build/push + create-agent-runtime
```

The Next.js app keeps its in-process agent for live SSE streaming and the
interactive ERP pause; the AgentCore deployment is the request/response
counterpart. See [`../agentcore/README.md`](../agentcore/README.md) for details.
