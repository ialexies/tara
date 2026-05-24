#!/usr/bin/env bash
# Start the API in dev mode with DATABASE_URL set
set -euo pipefail
export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"
fnm use 22.13.0 >/dev/null 2>&1
export DATABASE_URL="${DATABASE_URL:-postgres://tara:tara@localhost:5432/tara_dev}"
cd "$HOME/projects/tara/apps/api"
exec pnpm dev
