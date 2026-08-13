#!/bin/sh
set -eu
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if command -v pre-commit >/dev/null 2>&1; then
  echo "Installing pre-commit hooks via pre-commit framework..."
  pre-commit install
  echo "Done. Hooks from .pre-commit-config.yaml are active."
else
  echo "pre-commit not found — installing fallback .githooks/pre-commit via git config core.hooksPath."
  if [ -f .githooks/pre-commit ]; then
    chmod +x .githooks/pre-commit
  fi
  git config core.hooksPath .githooks
  echo "Done. Fallback hook at .githooks/pre-commit is active."
  echo "For the full pre-commit framework, install it:  pip install pre-commit  or  brew install pre-commit"
  echo "Then run:  pre-commit install"
fi
