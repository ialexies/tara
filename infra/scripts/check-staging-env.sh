#!/usr/bin/env bash
# Checks that all required env vars are present in the staging .env file.
# Run before any manual Portainer redeploy to catch sync gaps early.
set -euo pipefail

ENV_FILE="${1:-/home/ialexies/stacks/tara-staging/.env}"

REQUIRED=(
  JWT_SECRET
  FIREBASE_PROJECT_ID
  FIREBASE_CLIENT_EMAIL
  FIREBASE_PRIVATE_KEY
  NEXT_PUBLIC_FIREBASE_API_KEY
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
  NEXT_PUBLIC_FIREBASE_PROJECT_ID
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
  NEXT_PUBLIC_FIREBASE_APP_ID
  STRIPE_SECRET_KEY
  STRIPE_WEBHOOK_SECRET
  RESEND_API_KEY
  EMAIL_FROM
  R2_ACCOUNT_ID
  R2_ACCESS_KEY_ID
  R2_SECRET_ACCESS_KEY
  R2_BUCKET
  R2_PUBLIC_URL
  NEXT_PUBLIC_SENTRY_DSN
)

if [[ ! -f "$ENV_FILE" ]]; then
  echo "ERROR: env file not found: $ENV_FILE" >&2
  exit 1
fi

MISSING=()
for var in "${REQUIRED[@]}"; do
  if ! grep -q "^${var}=" "$ENV_FILE"; then
    MISSING+=("$var")
  fi
done

if [[ ${#MISSING[@]} -eq 0 ]]; then
  echo "OK — all ${#REQUIRED[@]} required vars present in $ENV_FILE"
  exit 0
else
  echo "MISSING vars in $ENV_FILE:"
  for v in "${MISSING[@]}"; do
    echo "  - $v"
  done
  exit 1
fi
