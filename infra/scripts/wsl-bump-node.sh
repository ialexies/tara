#!/usr/bin/env bash
# Bump Node to 22.13.0 and reinstall deps
set -euo pipefail

export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"

echo "=== Installing Node 22.13.0 ==="
fnm install 22.13.0
fnm default 22.13.0
fnm use 22.13.0

# Re-enable corepack pnpm under new Node
corepack enable
corepack prepare pnpm@9.12.0 --activate

echo ""
echo "=== Versions ==="
echo "node:  $(node --version)"
echo "pnpm:  $(pnpm --version)"

# Sync updated config files from Windows-side source to WSL copy
echo ""
echo "=== Syncing updated config files ==="
cp "/mnt/e/SofEn Projects/tara/.nvmrc"        "$HOME/projects/tara/.nvmrc"
cp "/mnt/e/SofEn Projects/tara/package.json"  "$HOME/projects/tara/package.json"

cd "$HOME/projects/tara"
echo ""
echo "=== Running pnpm install ==="
pnpm install

echo ""
echo "✅ Done."
