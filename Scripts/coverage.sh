#!/usr/bin/env bash
# coverage.sh — wrapper delegating to check-coverage.sh
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
exec "$DIR/check-coverage.sh" "$@"
