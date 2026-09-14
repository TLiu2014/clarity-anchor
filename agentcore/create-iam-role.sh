#!/usr/bin/env bash
# Create the AgentCore Runtime execution role. Prints the ROLE_ARN to use with deploy.sh.
set -euo pipefail

REGION="${AWS_REGION:-us-west-2}"
ACCOUNT_ID="$(aws sts get-caller-identity --query Account --output text)"
ROLE_NAME="${ROLE_NAME:-clarityanchor-agentcore-role}"
HERE="$(cd "$(dirname "$0")" && pwd)"

TRUST="$(sed -e "s/REPLACE_ACCOUNT_ID/${ACCOUNT_ID}/g" -e "s/REPLACE_REGION/${REGION}/g" "${HERE}/iam/trust-policy.json")"

echo "==> Creating role ${ROLE_NAME}"
aws iam create-role \
  --role-name "${ROLE_NAME}" \
  --assume-role-policy-document "${TRUST}" >/dev/null 2>&1 \
  || aws iam update-assume-role-policy --role-name "${ROLE_NAME}" --policy-document "${TRUST}"

echo "==> Attaching inline permissions policy"
aws iam put-role-policy \
  --role-name "${ROLE_NAME}" \
  --policy-name clarityanchor-agentcore-permissions \
  --policy-document "file://${HERE}/iam/permissions-policy.json"

ROLE_ARN="$(aws iam get-role --role-name "${ROLE_NAME}" --query Role.Arn --output text)"
echo "==> ROLE_ARN=${ROLE_ARN}"
echo "Export it before deploying:  export ROLE_ARN=${ROLE_ARN}"
