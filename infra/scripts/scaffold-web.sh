#!/usr/bin/env bash
# Scaffold apps/web using create-next-app (non-interactive)
set -euo pipefail

export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"
fnm use 22.13.0 >/dev/null 2>&1

cd "$HOME/projects/tara"

# Remove any existing scaffolding
rm -rf apps/web

# create-next-app with all non-interactive flags
pnpm create next-app@latest apps/web \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --eslint \
  --use-pnpm \
  --skip-install \
  --turbopack \
  --yes

echo ""
echo "=== Scaffold complete. apps/web contents: ==="
ls -la apps/web
