#!/usr/bin/env bash
# Set up fnm + Node + pnpm env, then run pnpm install in the project
set -euo pipefail

# Activate fnm
export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"

# Use Node 20.18.0
fnm use 20.18.0

echo "=== Versions ==="
echo "node:  $(which node) -> $(node --version)"
echo "pnpm:  $(which pnpm) -> $(pnpm --version)"
echo ""

# Move to project and install
cd "$HOME/projects/tara"
echo "=== Running pnpm install ==="
pnpm install

echo ""
echo "✅ Done."
