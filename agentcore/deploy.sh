#!/usr/bin/env bash
# Deploy ClarityAnchor's Strands agent to Amazon Bedrock AgentCore Runtime.
# Prereqs: AWS CLI v2 (logged in), Docker (with buildx for arm64), Claude model
# access enabled in $REGION, and an execution role (see create-iam-role.sh).
set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ECR_REPO="${ECR_REPO:-clarityanchor-agentcore}"
RUNTIME_NAME="${RUNTIME_NAME:-clarityanchor}"
ROLE_ARN="${ROLE_ARN:?Set ROLE_ARN to the AgentCore execution role ARN (see create-iam-role.sh)}"
IMAGE_URI="${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com/${ECR_REPO}:latest"

echo "==> Ensuring ECR repo ${ECR_REPO} in ${REGION}"
aws ecr describe-repositories --repository-names "${ECR_REPO}" --region "${REGION}" >/dev/null 2>&1 \
  || aws ecr create-repository --repository-name "${ECR_REPO}" --region "${REGION}" >/dev/null

echo "==> Logging Docker into ECR"
aws ecr get-login-password --region "${REGION}" \
  | docker login --username AWS --password-stdin "${ACCOUNT_ID}.dkr.ecr.${REGION}.amazonaws.com"

echo "==> Building + pushing arm64 image ${IMAGE_URI}"
docker buildx build --platform linux/arm64 -t "${IMAGE_URI}" --push .

echo "==> Creating/updating AgentCore Runtime ${RUNTIME_NAME}"
if aws bedrock-agentcore-control get-agent-runtime --agent-runtime-name "${RUNTIME_NAME}" --region "${REGION}" >/dev/null 2>&1; then
  aws bedrock-agentcore-control update-agent-runtime \
    --agent-runtime-name "${RUNTIME_NAME}" \
    --agent-runtime-artifact "containerConfiguration={containerUri=${IMAGE_URI}}" \
    --role-arn "${ROLE_ARN}" \
    --network-configuration "networkMode=PUBLIC" \
    --protocol-configuration "serverProtocol=HTTP" \
    --region "${REGION}"
else
  aws bedrock-agentcore-control create-agent-runtime \
    --agent-runtime-name "${RUNTIME_NAME}" \
    --agent-runtime-artifact "containerConfiguration={containerUri=${IMAGE_URI}}" \
    --role-arn "${ROLE_ARN}" \
    --network-configuration "networkMode=PUBLIC" \
    --protocol-configuration "serverProtocol=HTTP" \
    --region "${REGION}"
fi

echo "==> Done. Fetch the runtime ARN with:"
echo "    aws bedrock-agentcore-control get-agent-runtime --agent-runtime-name ${RUNTIME_NAME} --region ${REGION}"
