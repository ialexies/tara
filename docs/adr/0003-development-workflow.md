# ADR-0003: Development workflow — Windows + WSL2 → Ubuntu staging

- **Status:** Accepted
- **Date:** 2026-05-24
- **Deciders:** Founder

## Context

The developer (solo) works on a Windows 11 machine. The staging server is Ubuntu 22.04 (home server). Eventually production will run on Linux too (cloud or scaled home setup).

Cross-platform development between Windows and Linux is a known source of bugs that don't surface until deploy time. The most common categories are:

1. **Case sensitivity** — `./Foo` vs `./foo` is the same on Windows, different on Linux
2. **Line endings** — CRLF vs LF, breaks shell scripts and some tooling
3. **Path separators** — `\` vs `/` in string-concatenated paths
4. **Shell scripts** — `.sh` vs `.ps1` incompatibility
5. **Environment variable syntax** — bash `VAR=value` vs PowerShell `$env:VAR='value'`
6. **Native modules** — `bcrypt`, `sharp`, etc. compile per-OS, can't be copied across
7. **File watchers** — chokidar/nodemon flakiness on Windows native and across WSL boundaries
8. **Symlinks** — Windows requires Developer Mode for non-admin symlink creation (pnpm uses these heavily)

We need a workflow that eliminates these as a class, not handles each as it arises.

## Decision

**Develop inside WSL2 (Ubuntu 22.04) on the Windows machine.** The dev environment becomes a literal Linux box, identical in OS family to the staging server.

Specifically:

- **WSL2 + Ubuntu 22.04** as the development environment
- **Project lives in WSL2 filesystem** (`~/projects/tara`), NOT under `/mnt/e/...` (Windows mount). The Windows-mount path has ~10x slower file I/O via the 9P protocol.
- **VS Code (Windows) + "WSL" extension** — editor UI on Windows, runtime + terminal in WSL2
- **Docker Desktop for Windows with WSL2 integration** — Docker daemon runs in WSL2, accessible from both Windows and WSL2
- **Node + pnpm installed inside WSL2** via `fnm` (matches `.nvmrc`)
- **Git configured inside WSL2** with `core.autocrlf=input`
- **All commands run inside WSL2 shell** — no PowerShell development

For deployment:

- **Self-hosted GitHub Actions runner on the home server** (Linux container, free)
- **Workflows build Docker images, push to local registry on home server, update via Portainer API**
- **Staging URL** via Cloudflare Tunnel: `staging.tara.ph`
- **No manual deploys from the dev machine** — everything goes through CI

## Alternatives considered

- **Native Windows dev** — All 8 pitfalls remain. Bugs found at staging time. Rejected: poor ROI vs WSL2 setup cost.
- **Dual-boot or full Linux machine** — Eliminates the pitfalls but disrupts workflow (Office, design tools, comms apps). Rejected: too disruptive.
- **GitHub Codespaces / Gitpod** — Cloud-hosted dev environment, environment parity built in. Rejected: ongoing cost (~$30-100/mo), requires internet, slower than local for heavy work.
- **Docker-based dev (everything in containers, including the IDE)** — Considered. Works but adds container overhead for every command. Rejected: WSL2 gives most of the benefits with less friction.
- **Only Docker for the data layer (Postgres/Redis), Windows for Node** — Mitigates ~3 of 8 pitfalls but leaves the most painful ones (case sensitivity, line endings, symlinks). Rejected as insufficient.

## Consequences

**Positive**

- Environment parity: dev OS family = staging OS = production OS. Bugs surface in dev, not at deploy.
- Skills are directly transferable to operating the Ubuntu server.
- Symlinks "just work" — pnpm monorepo links function correctly.
- Native module compilation matches the staging server.
- File watchers work reliably.
- Docker performance is native (containers run on the same WSL2 kernel).

**Negative / trade-offs**

- One-time WSL2 setup (~30-45 min) — documented in `docs/infra/development-workflow.md`.
- Slight learning ramp on Linux/bash for any newcomer (acceptable; Linux fluency is required for ops anyway).
- Files accessed from the Windows side use `\\wsl$\Ubuntu\...` paths, feels slightly weird initially.
- WSL2 uses slightly more RAM than native (Hyper-V hypervisor overhead).

**Neutral / things to watch**

- Docker Desktop licensing — free for personal use and orgs <$10M revenue. Watch for licensing changes; alternative is rootless Docker in WSL2 directly.
- WSL2 networking quirks (rare but real for specific use cases like mDNS) — workarounds exist.
- Backup discipline — projects in WSL2 filesystem must be in git (or backed up); Windows backup tools don't reach there by default.

## Implementation

Detailed step-by-step setup is in [`docs/infra/development-workflow.md`](../infra/development-workflow.md). Summary:

1. Enable Windows Developer Mode
2. `wsl --install -d Ubuntu-22.04`
3. Install Docker Desktop, enable WSL2 integration for Ubuntu-22.04
4. Inside WSL2: install `fnm`, Node 20.18, Corepack/pnpm
5. Configure git inside WSL2 with LF line endings
6. Install VS Code + "WSL" extension; open project via WSL terminal `code .`
7. Clone or move project to `~/projects/tara`
8. `pnpm install`

## References

- Conversation transcript 2026-05-24
- [`docs/infra/development-workflow.md`](../infra/development-workflow.md) — setup steps and daily workflow
- [ADR-0001 — Tech stack](0001-tech-stack.md)
- [Microsoft docs — Best practices for setting up WSL](https://learn.microsoft.com/en-us/windows/wsl/setup/environment)
