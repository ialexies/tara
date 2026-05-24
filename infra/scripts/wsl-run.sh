#!/usr/bin/env bash
# Activate Tara's dev environment, then run whatever command is passed.
# Usage:  ./wsl-run.sh <command...>
# Example: ./wsl-run.sh pnpm db:up
set -euo pipefail

# Activate fnm and Node
export FNM_DIR="$HOME/.local/share/fnm"
export PATH="$FNM_DIR:$PATH"
eval "$(fnm env --use-on-cd --shell bash)"
fnm use 22.13.0 >/dev/null 2>&1 || fnm use default

cd "$HOME/projects/tara"

# Run whatever command was passed
exec "$@"
