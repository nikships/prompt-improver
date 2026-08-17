#!/bin/zsh
# Builds, signs, notarizes, and packages Prompt Improver via electron-builder.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"

export CSC_NAME="Developer ID Application: Nikhil Anand (NW6B3R27LQ)"
export APPLE_ID="nik.anand.1998@gmail.com"
export APPLE_APP_SPECIFIC_PASSWORD="qysf-exrb-xjmt-mxcp"
export APPLE_TEAM_ID="NW6B3R27LQ"

VERSION="$(node -p "require('./package.json').version")"
APP_NAME="Prompt Improver"
DIST="$REPO_ROOT/dist"
APP="$DIST/mac-arm64/$APP_NAME.app"
DMG="$DIST/PromptImprover-$VERSION.dmg"
ZIP="$DIST/PromptImprover-$VERSION.zip"

echo "==> Building, signing, and notarizing $APP_NAME $VERSION..."
npm run package

if [[ ! -d "$APP" ]]; then
  echo "error: expected app bundle at $APP" >&2
  exit 1
fi

if [[ ! -f "$DMG" || ! -f "$ZIP" ]]; then
  echo "error: expected artifacts:" >&2
  echo "  $DMG" >&2
  echo "  $ZIP" >&2
  ls -la "$DIST" >&2
  exit 1
fi

echo "==> Stapling notarization ticket to .app..."
xcrun stapler staple "$APP"

echo "==> Stapling notarization ticket to .dmg..."
if ! xcrun stapler staple "$DMG"; then
  echo "==> DMG ticket missing; submitting DMG to notary..."
  xcrun notarytool submit "$DMG" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_APP_SPECIFIC_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait
  xcrun stapler staple "$DMG"
fi

echo "==> Recreating zip from stapled app..."
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"

echo "==> Validating signature and Gatekeeper..."
codesign --verify --deep --strict --verbose=2 "$APP"
spctl --assess -vv --type execute "$APP"

echo "==> Packaging complete!"
ls -lh "$APP" "$DMG" "$ZIP"
