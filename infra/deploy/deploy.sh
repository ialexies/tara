#!/bin/bash
set -euo pipefail

REPO=/repo
ENV_FILE=/env/.env
COMPOSE_FILE="$REPO/infra/portainer/stacks/tara-staging.yml"

log() { echo "[deploy] $*"; }

cd "$REPO"
log "Pulling latest code..."
git pull origin main -q

read_env() {
  grep "^$1=" "$ENV_FILE" | cut -d= -f2- | tr -d '"'
}

log "Building API image..."
docker build -f apps/api/Dockerfile -t tara-api:staging .

log "Building Web image..."
docker build -f apps/web/Dockerfile \
  --build-arg NEXT_PUBLIC_API_URL=https://api-staging.tara-stays.com \
  --build-arg NEXT_PUBLIC_FIREBASE_API_KEY="$(read_env NEXT_PUBLIC_FIREBASE_API_KEY)" \
  --build-arg NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="$(read_env NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN)" \
  --build-arg NEXT_PUBLIC_FIREBASE_PROJECT_ID="$(read_env NEXT_PUBLIC_FIREBASE_PROJECT_ID)" \
  --build-arg NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="$(read_env NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET)" \
  --build-arg NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="$(read_env NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID)" \
  --build-arg NEXT_PUBLIC_FIREBASE_APP_ID="$(read_env NEXT_PUBLIC_FIREBASE_APP_ID)" \
  --build-arg R2_PUBLIC_URL="$(read_env R2_PUBLIC_URL)" \
  --build-arg NEXT_PUBLIC_SENTRY_DSN="$(read_env NEXT_PUBLIC_SENTRY_DSN)" \
  -t tara-web:staging .

log "Restarting containers..."
docker compose \
  --env-file "$ENV_FILE" \
  -f "$COMPOSE_FILE" \
  -p tara-staging \
  up -d --no-deps --force-recreate api web

log "Done."
