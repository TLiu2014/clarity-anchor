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
```
This builds `.next` standalone into a Docker image and pushes it to
`clarityanchor-web:latest` in ECR.

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

## Notes
- If the container errors at runtime with a missing module from the Strands SDK,
  widen `outputFileTracingIncludes` in `next.config.mjs` (it already includes
  `@strands-agents`, `@aws-sdk`, `@smithy`).
- The agent is also deployable to Bedrock AgentCore Runtime — see `../agentcore/`.
