#!/usr/bin/env bash
# Sunfade 1971 local dev: run the save-companion alongside `next dev`.
# Ctrl+C stops both.
set -euo pipefail
cd "$(dirname "$0")/../.."

node src/scripts/save-defaults-server.mjs &
SAVE_SERVER_PID=$!
trap 'kill "$SAVE_SERVER_PID" 2>/dev/null || true' EXIT INT TERM

pnpm dev
