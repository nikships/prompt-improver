#!/usr/bin/env bash
# check-coverage.sh — enforce coverage thresholds for testable logic.
# Usage:
#   ./Scripts/check-coverage.sh            # builds + checks
#   ./Scripts/check-coverage.sh --no-build # check existing profdata only
#
# Coverage is measured via `swift test --enable-code-coverage` and
# `xcrun llvm-cov report` against the test binary. The app binary itself
# is not instrumented (only the test bundle is), so "overall" is the test
# binary TOTAL which includes both Sources and Tests. UI code (ContentView,
# LogoView, App) is not unit-testable, so overall line coverage is modest.
# Thresholds are set just below the current measured values so they pass
# but catch regressions.
#
# Current measured (2026-08-13):
#   ModelCatalog.swift:  100% lines (15 regions)
#   DroidRunner.swift:    21% lines (parseResult + errors covered; improve/findDroid require process)
#   Theme.swift:           3% lines (static lets not counted; mono() covered)
#   TOTAL (test binary):  26% lines, 45% regions
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$REPO_ROOT"

MODELCATALOG_MIN=90
TOTAL_LINE_MIN=20

NO_BUILD=false
if [[ "${1:-}" == "--no-build" ]]; then NO_BUILD=true; fi

if [[ "$NO_BUILD" == false ]]; then
  echo "==> swift test --enable-code-coverage"
  swift test --enable-code-coverage
fi

PROFDATA=".build/out/Products/Debug/codecov/default.profdata"
if [[ ! -f "$PROFDATA" ]]; then
  PROFDATA="$(find .build -name "default.profdata" -print -quit 2>/dev/null || true)"
fi
if [[ -z "${PROFDATA:-}" || ! -f "$PROFDATA" ]]; then
  echo "error: profdata not found. Run 'swift test --enable-code-coverage' first." >&2
  exit 2
fi

TEST_BIN=".build/out/Products/Debug/PromptImproverTests.xctest/Contents/MacOS/PromptImproverTests"
if [[ ! -f "$TEST_BIN" ]]; then
  TEST_BIN="$(find .build -path "*/PromptImproverTests.xctest/Contents/MacOS/PromptImproverTests" -print -quit 2>/dev/null || true)"
fi
if [[ -z "$TEST_BIN" || ! -f "$TEST_BIN" ]]; then
  echo "error: coverage test binary not found" >&2; exit 2
fi

echo "==> profdata: $PROFDATA"
echo "==> binary:   $TEST_BIN"
echo ""
xcrun llvm-cov report "$TEST_BIN" -instr-profile="$PROFDATA" 2>/dev/null | grep -E "^(Filename|Sources/|Tests/|TOTAL)" | head -20
echo ""

# Extract the Lines Cover (%) which is the 3rd percentage on each row.
# llvm-cov warns on stderr when profdata is stale; suppress stderr so grep sees the table.
line_cover() {
  local pattern="$1"
  xcrun llvm-cov report "$TEST_BIN" -instr-profile="$PROFDATA" 2>/dev/null \
    | grep -F "$pattern" | head -1 | grep -oE '[0-9]+\.[0-9]+%' | sed -n '3p' | tr -d '%'
}

MC_COVER="$(line_cover "ModelCatalog.swift" || echo 0)"
TOTAL_COVER="$(line_cover "TOTAL" || echo 0)"
MC_COVER="${MC_COVER:-0}"
TOTAL_COVER="${TOTAL_COVER:-0}"

echo "ModelCatalog line cover: ${MC_COVER}% (min ${MODELCATALOG_MIN}%)"
echo "TOTAL line cover:        ${TOTAL_COVER}% (min ${TOTAL_LINE_MIN}%)"
echo ""

FAIL=0
check() {
  local name="$1" actual="$2" minimum="$3"
  if awk "BEGIN {exit !(($actual)+0 < ($minimum)+0)}"; then
    echo "FAIL: $name ${actual}% < ${minimum}%"
    FAIL=1
  else
    echo "PASS: $name ${actual}% >= ${minimum}%"
  fi
}

check "ModelCatalog" "$MC_COVER" "$MODELCATALOG_MIN"
check "TOTAL" "$TOTAL_COVER" "$TOTAL_LINE_MIN"

echo ""
if [[ "$FAIL" -ne 0 ]]; then
  echo "Coverage check FAILED."
  echo "Inspect with:"
  echo "  xcrun llvm-cov report \"$TEST_BIN\" -instr-profile=\"$PROFDATA\""
  echo "  xcrun llvm-cov show \"$TEST_BIN\" -instr-profile=\"$PROFDATA\" Sources/PromptImprover/DroidRunner.swift"
  exit 1
fi

echo "Coverage check PASSED."
echo "For per-file detail:"
echo "  xcrun llvm-cov show \"$TEST_BIN\" -instr-profile=\"$PROFDATA\" Sources/PromptImprover/ModelCatalog.swift"
