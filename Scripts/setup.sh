#!/usr/bin/env bash
# setup.sh — Single-command project setup for Prompt Improver.
# Verifies environment prerequisites, installs git hooks, builds the package,
# and runs the test suite with coverage verification.
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

echo "==> [1/4] Checking prerequisites..."

# 1. macOS check
if [[ "$(uname)" != "Darwin" ]]; then
  echo "warning: Prompt Improver is a native macOS app (macOS 14+ recommended)."
fi

# 2. Swift check
if ! command -v swift >/dev/null 2>&1; then
  echo "error: Swift toolchain not found. Install Xcode 15+ or Xcode Command Line Tools: xcode-select --install" >&2
  exit 1
fi
echo "    Swift: $(swift --version | head -1)"

# 3. SwiftLint check (optional for running, required for linting in CI)
if command -v swiftlint >/dev/null 2>&1; then
  echo "    SwiftLint: $(swiftlint version)"
else
  echo "    SwiftLint: not found (install via 'brew install swiftlint' for lint checks)"
fi

# 4. droid CLI check (runtime integration)
if command -v droid >/dev/null 2>&1; then
  echo "    droid CLI: found at $(command -v droid)"
else
  echo "    droid CLI: not found in current PATH (install via https://docs.factory.ai)"
fi

echo "==> [2/4] Setting up git hooks..."
if [[ -x "./Scripts/install-hooks.sh" ]]; then
  ./Scripts/install-hooks.sh
elif [[ -f "./Scripts/install-hooks.sh" ]]; then
  bash ./Scripts/install-hooks.sh
fi

echo "==> [3/4] Building Swift package..."
swift build

echo "==> [4/4] Running tests and verifying coverage..."
if [[ -x "./Scripts/check-coverage.sh" ]]; then
  ./Scripts/check-coverage.sh
elif [[ -f "./Scripts/check-coverage.sh" ]]; then
  bash ./Scripts/check-coverage.sh
else
  swift test --enable-code-coverage
fi

echo ""
echo "Setup complete! You can now run the app:"
echo "  swift run                      # run debug build directly"
echo "  ./Scripts/build-app.sh         # assemble dist/PromptImprover.app"
echo "  open dist/PromptImprover.app   # launch assembled app"
