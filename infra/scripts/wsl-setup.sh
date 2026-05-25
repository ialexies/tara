#!/usr/bin/env bash
# WSL2 Tara dev environment setup
# Idempotent — safe to re-run.
# Skips anything already done. No sudo required for any of this.

set -euo pipefail

echo "=========================================="
echo "  Tara WSL2 dev setup"
echo "=========================================="

# ── 1. fnm (Fast Node Manager) ─────────────────
if command -v fnm >/dev/null 2>&1; then
  echo "[1/6] fnm already installed: $(fnm --version)"
else
  echo "[1/6] Installing fnm..."
  curl -fsSL https://fnm.vercel.app/install | bash -s -- --skip-shell
  # Add to .bashrc if not already there
  if ! grep -q "fnm env" "$HOME/.bashrc" 2>/dev/null; then
    {
      echo ''
      echo '# fnm'
      echo 'export PATH="$HOME/.local/share/fnm:$PATH"'
      echo 'eval "$(fnm env --use-on-cd)"'
    } >> "$HOME/.bashrc"
  fi
  # Activate for the current script execution
  export PATH="$HOME/.local/share/fnm:$PATH"
  eval "$(fnm env --use-on-cd)"
  echo "  installed: $(fnm --version)"
fi

# Always make sure fnm is in PATH for this script
export PATH="$HOME/.local/share/fnm:$PATH"
eval "$(fnm env --use-on-cd)"

# ── 2. Node 20.18.0 ───────────────────────────
if node --version 2>/dev/null | grep -q "v20.18.0"; then
  echo "[2/6] Node 20.18.0 already installed"
else
  echo "[2/6] Installing Node 20.18.0..."
  fnm install 20.18.0
  fnm default 20.18.0
  fnm use 20.18.0
  echo "  installed: $(node --version)"
fi

# ── 3. pnpm via corepack ──────────────────────
if pnpm --version 2>/dev/null | grep -q "^9\."; then
  echo "[3/6] pnpm 9.x already installed: $(pnpm --version)"
else
  echo "[3/6] Enabling pnpm via corepack..."
  corepack enable
  corepack prepare pnpm@9.12.0 --activate
  echo "  installed: $(pnpm --version)"
fi

# ── 4. Git config ─────────────────────────────
echo "[4/6] Configuring git..."
git config --global user.name "Alexies"
git config --global user.email "ialexies@gmail.com"
git config --global core.autocrlf input
git config --global init.defaultBranch main
git config --global pull.rebase true
echo "  user.name: $(git config --global user.name)"
echo "  user.email: $(git config --global user.email)"
echo "  core.autocrlf: $(git config --global core.autocrlf)"

# ── 5. Move project into WSL filesystem ───────
PROJECT_DIR="$HOME/projects/tara"
if [ -d "$PROJECT_DIR" ]; then
  echo "[5/6] Project already at $PROJECT_DIR"
else
  echo "[5/6] Copying project from Windows side..."
  mkdir -p "$HOME/projects"
  cp -r "/mnt/e/SofEn Projects/tara" "$PROJECT_DIR"
  echo "  copied to $PROJECT_DIR"
fi

# ── 6. Verify Docker works from this Ubuntu ────
echo "[6/6] Verifying Docker integration..."
if docker version >/dev/null 2>&1; then
  echo "  Docker OK: $(docker --version)"
else
  echo "  ⚠ Docker not accessible. Open Docker Desktop → Settings → Resources → WSL Integration → enable for Ubuntu"
  exit 1
fi

echo ""
echo "=========================================="
echo "  ✅ Setup complete"
echo "=========================================="
echo ""
echo "Next:"
echo "  cd ~/projects/tara"
echo "  pnpm install"
echo "  pnpm db:up"
echo ""
