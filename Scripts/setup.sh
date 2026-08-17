#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "=== Prompt Improver Setup ==="

# Check Node.js
if ! command -v node >/dev/null 2>&1; then
  echo "Error: Node.js is required (v20+ or v22+ recommended). Install via brew or nvm." >&2
  exit 1
fi
echo "Node: $(node --version)"

# Check npm
if ! command -v npm >/dev/null 2>&1; then
  echo "Error: npm is required." >&2
  exit 1
fi
echo "npm: $(npm --version)"

# Check droid CLI
if command -v droid >/dev/null 2>&1; then
  echo "droid CLI: $(droid --version 2>/dev/null || echo 'installed')"
else
  echo "Warning: 'droid' CLI not found on PATH. Prompt Improver will look in standard locations at runtime." >&2
fi

# Install npm dependencies
echo "Installing dependencies..."
npm install

# Install git hooks
if [ -f "./Scripts/install-hooks.sh" ]; then
  echo "Installing git hooks..."
  bash ./Scripts/install-hooks.sh
fi

# Run check
echo "Running verification checks..."
npm run check

echo "=== Setup complete! Run 'npm run dev' to launch the app. ==="
