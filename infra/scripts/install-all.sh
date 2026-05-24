#!/usr/bin/env bash
set -euo pipefail
export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"
fnm use 22.13.0 >/dev/null 2>&1
cd "$HOME/projects/tara"
echo "=== pnpm install (workspace-wide) ==="
pnpm install
echo ""
echo "=== Workspace tree ==="
pnpm -r list --depth=-1 2>/dev/null | head -40
