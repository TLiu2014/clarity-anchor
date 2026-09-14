#!/usr/bin/env bash
# Build the ClarityAnchor web image locally and push it to ECR.
# No AWS build service is used — your machine builds the image; EC2 just runs it.
# The Next app is built on the HOST (pnpm build) and the image only packages the
# standalone output (no `pnpm install`/build runs inside the container).
# Prereqs: AWS CLI v2 (logged in), Docker with buildx, pnpm.
set -euo pipefail

cd "$(dirname "$0")/.."   # repo root (build context)

echo "==> Building Next standalone on the host (pnpm build)"
pnpm build

echo "==> Injecting externalized Strands runtime closure into standalone"
node deploy/copy-mcp-deps.mjs

REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REPO="${ECR_REPO:-clarityanchor-web}"
# Match your EC2 instance arch: linux/amd64 (t3/t2) or linux/arm64 (t4g Graviton).
PLATFORM="${PLATFORM:-linux/amd64}"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"

echo "==> Ensuring ECR repo ${ECR_REPO} in ${REGION}"
aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${REGION}" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "${ECR_REPO}" --region "${REGION}" >/dev/null

echo "==> Logging Docker into ECR"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Building (${PLATFORM}) + pushing ${IMAGE_URI}"
docker buildx build --platform "${PLATFORM}" -t "${IMAGE_URI}" --push .

echo "==> Done. On the EC2 host, pull & run:"
echo "    aws ecr get-login-password --region ${REGION} | docker login --username AWS --password-stdin ${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"
echo "    docker pull ${IMAGE_URI}"
echo "    docker run -d --restart unless-stopped -p 3000:3000 \\"
echo "      -e MODEL_PROVIDER=bedrock -e AWS_REGION=${REGION} -e DEMO_LATENCY_MS=0 \\"
echo "      --name clarityanchor ${IMAGE_URI}"
