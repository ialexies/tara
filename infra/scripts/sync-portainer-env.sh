#!/usr/bin/env python3
# Syncs Portainer stack env vars → /home/ialexies/stacks/tara-staging/.env
# Run on the home server before docker compose up.
#
# Requires PORTAINER_API_TOKEN env var (Portainer → User settings → Access tokens)
# Stack ID defaults to 160 (tara-staging). Override with PORTAINER_STACK_ID.

import json
import os
import subprocess
import sys

PORTAINER_URL = "https://localhost:9443"
API_TOKEN = os.environ.get("PORTAINER_API_TOKEN", "")
STACK_ID = os.environ.get("PORTAINER_STACK_ID", "160")
ENV_FILE = "/home/ialexies/stacks/tara-staging/.env"

# Required secrets — deploy aborts if any are empty after sync
REQUIRED = ["STRIPE_SECRET_KEY", "RESEND_API_KEY", "R2_ACCOUNT_ID", "JWT_SECRET"]

if not API_TOKEN:
    print("ERROR: PORTAINER_API_TOKEN env var is required", file=sys.stderr)
    sys.exit(1)

result = subprocess.run(
    ["curl", "-sk", "-H", f"X-API-Key: {API_TOKEN}",
     f"{PORTAINER_URL}/api/stacks/{STACK_ID}"],
    capture_output=True, text=True
)

try:
    data = json.loads(result.stdout)
except json.JSONDecodeError:
    print(f"ERROR: Portainer returned non-JSON: {result.stdout[:200]}", file=sys.stderr)
    sys.exit(1)

if "message" in data:
    print(f"ERROR: Portainer API error: {data['message']} — token may be expired", file=sys.stderr)
    sys.exit(1)

env_vars = data.get("Env", [])
if not env_vars:
    print(f"ERROR: No env vars returned for stack {STACK_ID} — check token/stack ID", file=sys.stderr)
    sys.exit(1)

env_map = {e["name"]: e["value"] for e in env_vars}

# Abort if any required secret is missing or empty
missing = [k for k in REQUIRED if not env_map.get(k)]
if missing:
    print(f"ERROR: Required secrets are empty in Portainer: {', '.join(missing)}", file=sys.stderr)
    print("Add them in Portainer → Stacks → tara-staging → Editor → Environment variables", file=sys.stderr)
    sys.exit(1)

lines = []
for e in env_vars:
    name = e["name"]
    value = e["value"]
    escaped = value.replace("\\", "\\\\").replace('"', '\\"')
    lines.append(f'{name}="{escaped}"')

with open(ENV_FILE, "w") as f:
    f.write("\n".join(lines) + "\n")

print(f"✓ Synced {len(lines)} vars from Portainer stack {STACK_ID} → {ENV_FILE}")
print(f"✓ Required secrets verified: {', '.join(REQUIRED)}")
