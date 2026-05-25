# Development Workflow

Tara is developed on **Windows** and deployed to **Ubuntu** (home server staging, eventually cloud production). This document covers the cross-platform conventions, the pitfalls to avoid, and the day-to-day workflow.

## TL;DR

- **Develop inside WSL2 on Windows.** Treat your dev environment as Linux. This eliminates most cross-platform bugs.
- **Run everything in Docker** for the data layer (Postgres, Redis, etc.). Don't install these natively.
- **Never deploy from your machine.** Always through CI (GitHub Actions) so the build runs on Linux.
- **Same Node, pnpm, Postgres, Redis versions everywhere** — pinned in `.nvmrc`, `package.json`, and Docker images.

---

## Environment matrix

| | Local (your machine) | Staging (home server) | Production (future cloud) |
| --- | --- | --- | --- |
| OS | Windows 11 + WSL2 Ubuntu | Ubuntu Server | Linux (Vercel / cloud) |
| Node | 20.18.0 (`.nvmrc`) | 20.18.0 (Docker image) | 20.18.0 |
| pnpm | 9.12.0 (`packageManager`) | 9.12.0 | 9.12.0 |
| Postgres | 16 (Docker) | 16 (Docker) | 16 (managed) |
| Redis | 7 (Docker) | 7 (Docker) | 7 (managed) |
| Deploy via | n/a (local only) | GitHub Actions → SSH | GitHub Actions → cloud API |

---

## One-time setup (Windows machine)

### 1. Enable Developer Mode (for symlinks)

`Settings → Privacy & security → For developers → Developer Mode: ON`

This lets pnpm create symlinks without admin rights, which it needs for monorepo package linking.

### 2. Install WSL2 + Ubuntu

```powershell
wsl --install -d Ubuntu-22.04
```

Restart, set a username/password when prompted. Then update:

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y build-essential curl git
```

### 3. Install Docker Desktop (Windows side)

Download from docker.com. Enable **WSL2 backend** in Docker Desktop settings → Resources → WSL Integration → enable for Ubuntu-22.04.

This way `docker` works inside WSL2 and uses the Docker Desktop engine.

### 4. Install Node + pnpm inside WSL2

Use [fnm](https://github.com/Schniz/fnm) (faster than nvm):

```bash
curl -fsSL https://fnm.vercel.app/install | bash
# Add fnm to ~/.bashrc per the installer instructions, then:
fnm install 20.18.0
fnm default 20.18.0

# Enable Corepack (ships with Node) for pnpm
corepack enable
corepack prepare pnpm@9.12.0 --activate
```

### 5. Configure git inside WSL2

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.com"
git config --global core.autocrlf input       # NEVER convert LF to CRLF on commit
git config --global init.defaultBranch main
git config --global pull.rebase true
```

### 6. Install VS Code + WSL extension

Install VS Code on Windows. Install the **"WSL"** extension (by Microsoft).

To open the project: from WSL2 terminal, `cd ~/projects/tara && code .` — VS Code launches with WSL2 as the remote.

### 7. Clone the project INTO the WSL2 filesystem

```bash
mkdir -p ~/projects
cd ~/projects
# Either clone fresh, or move the existing Windows-side folder:
# Option A — clone:
# git clone <your-git-url> tara

# Option B — copy from Windows side (one-time, if you started on Windows):
cp -r "/mnt/e/SofEn Projects/tara" ~/projects/tara
cd ~/projects/tara
```

**Important:** Keep the project in `~/projects/tara` (Linux filesystem), NOT `/mnt/e/...` (Windows filesystem accessed from WSL). The Windows filesystem is ~10x slower from WSL2 due to the 9P protocol overhead. Native Linux filesystem = native speed.

### 8. Install dependencies

```bash
pnpm install
```

---

## Daily workflow

```bash
# Start your day
cd ~/projects/tara
git pull
pnpm install              # in case deps changed
docker compose -f infra/docker-compose.dev.yml up -d
pnpm dev                  # runs all apps via Turborepo

# In another terminal, watch logs
docker compose -f infra/docker-compose.dev.yml logs -f postgres

# Run tests
pnpm test
pnpm test:e2e

# Format + lint before committing
pnpm format
pnpm lint
pnpm typecheck

# Stop everything
docker compose -f infra/docker-compose.dev.yml down
```

---

## Cross-platform conventions

These are the rules that prevent "works on my machine" bugs.

### Line endings

- All text files use **LF** (Unix) line endings.
- Enforced by `.gitattributes` and `.editorconfig`.
- On Windows, set `git config --global core.autocrlf input` once.

### File path imports

- Always use forward slashes in code: `import x from './foo/bar'`.
- Never construct paths with string concatenation. Use `path.join()` or `path.resolve()`.
- TypeScript's `forceConsistentCasingInFileNames` catches casing mismatches at compile time.

### Shell scripts

- **No `.sh` or `.ps1` scripts.** Use TypeScript files run via `tsx`.
- Example: `scripts/seed-dev-data.ts` instead of `scripts/seed-dev-data.sh`.
- Runs everywhere Node runs.

### Environment variables in npm scripts

- Don't put env vars inline: `DATABASE_URL=... pnpm dev` — fails on Windows PowerShell.
- Use `.env` files loaded by dotenv (or Next.js / NestJS built-in support).
- For one-off command-line overrides cross-platform, use the `cross-env` package.

### Native binaries

- Never commit `node_modules`.
- Never copy `node_modules` between machines.
- After switching Node version: `rm -rf node_modules && pnpm install`.

### Docker volumes

- Use **named volumes** for data (`postgres-data:/var/lib/postgresql/data`), not bind mounts on Windows.
- Bind mounts work but are slower due to filesystem crossing.

---

## Git workflow

### Branches

- `main` is always deployable. Direct commits to `main` are fine for solo dev now; later add a `develop` branch when team grows.
- Feature branches: `feature/short-description`, `fix/short-description`, `chore/short-description`.

### Commits

We use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(booking): add hold expiry sweeper
fix(pricing): correct LOS discount edge case
chore(deps): bump pnpm to 9.12.0
docs(adr): add ADR-0003 for multi-tenancy
test(availability): add concurrency test for last-bed scenario
refactor(money): extract currency formatting
```

This enables:
- Auto-generated changelogs
- Semantic version bumps (Phase D)
- Easier release notes

### Pre-commit hooks

Husky + lint-staged will run automatically:

1. **Lint-staged** runs ESLint + Prettier on staged files
2. **Commitlint** validates commit message format
3. **TypeScript** checks via lint-staged extend

If a hook fails, the commit is blocked. Fix the issue and re-commit. **Do not bypass with `--no-verify`** — that's how bad code gets into main.

These will be set up in a follow-up task.

---

## CI / staging deploy flow

```
Push to feature branch
    ↓
GitHub Actions (self-hosted runner on home server)
    ├─ Install
    ├─ Lint
    ├─ Typecheck
    ├─ Unit + integration tests
    ├─ Build
    └─ Comment "Build OK" on PR
    ↓
Merge to main
    ↓
GitHub Actions
    ├─ All of the above
    ├─ Build Docker images (for web, api, jobs)
    ├─ Push to local registry on home server
    ├─ SSH into home server
    ├─ Portainer stack update via API
    ├─ Smoke tests against staging URL
    └─ Notify Discord on success/failure
```

Detailed in `docs/runbooks/deploy.md` once set up.

---

## Common pitfalls and fixes

### "It works on Windows but the test fails on the server"

99% of the time: case-sensitive import. Search the file:

```bash
grep -rn "from './" src/ | grep -v node_modules
```

Compare against the actual filename casing.

### "Docker says permission denied"

WSL2 Docker integration not enabled. Open Docker Desktop → Settings → Resources → WSL Integration.

### "pnpm install fails with EPERM symlink errors"

Windows Developer Mode is off. Enable it (Settings → Privacy & security → For developers).

### "Postgres is slow during `pnpm test`"

You're using a bind mount from Windows side. Either use a named volume, or move the project into the WSL2 filesystem (`~/projects/tara`, not `/mnt/e/...`).

### "Hot reload doesn't pick up file changes"

You're editing files on the Windows side but watcher is in WSL2 (or vice versa). Both editor and watcher should be on the same side. With VS Code + WSL extension, both are in WSL2.

### "node-gyp / native build failed"

Inside WSL2: `sudo apt install -y build-essential python3`. On Windows native (not recommended): install Visual Studio Build Tools.

---

## Why this setup matters

Every cross-platform bug you avoid in dev is one you don't have to debug at 11pm on a Friday when staging is broken. WSL2 + Docker + a disciplined dev workflow buys you that peace of mind for the cost of a 30-minute one-time setup.

See ADR-0004 (TBD) for the formal decision record on this workflow.
