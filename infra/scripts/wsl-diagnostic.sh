#!/usr/bin/env bash
# Diagnostic script — reports state of WSL2 dev environment

echo "=== Ubuntu version ==="
lsb_release -a 2>/dev/null

echo ""
echo "=== User + home ==="
echo "User: $USER"
echo "Home: $HOME"

echo ""
echo "=== Node + package managers ==="
node --version 2>/dev/null || echo "node: NOT INSTALLED"
pnpm --version 2>/dev/null || echo "pnpm: NOT INSTALLED"
npm --version 2>/dev/null || echo "npm: NOT INSTALLED"
fnm --version 2>/dev/null || echo "fnm: NOT INSTALLED"
nvm --version 2>/dev/null || echo "nvm: NOT INSTALLED"

echo ""
echo "=== Docker ==="
docker --version 2>/dev/null || echo "docker: NOT WORKING"
docker compose version 2>/dev/null || echo "docker compose: NOT WORKING"

echo ""
echo "=== Git ==="
git --version
echo "user.name: $(git config --global user.name || echo NOT SET)"
echo "user.email: $(git config --global user.email || echo NOT SET)"
echo "core.autocrlf: $(git config --global core.autocrlf || echo NOT SET)"

echo ""
echo "=== Build tools ==="
gcc --version 2>/dev/null | head -1 || echo "gcc: NOT INSTALLED"
make --version 2>/dev/null | head -1 || echo "make: NOT INSTALLED"

echo ""
echo "=== VS Code WSL command ==="
which code 2>/dev/null || echo "code: NOT IN PATH"

echo ""
echo "=== Project location ==="
ls -la ~/projects/ 2>/dev/null || echo "~/projects: does not exist yet"
echo "---"
ls "/mnt/e/SofEn Projects/tara" 2>/dev/null | head -5 || echo "Windows project: not found at expected path"
