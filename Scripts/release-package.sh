#!/bin/zsh
# Builds, signs, notarizes, and packages PromptImprover.app and PromptImprover.dmg / .zip
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"
APP_NAME="PromptImprover"
DIST="$REPO_ROOT/dist"
APP="$DIST/$APP_NAME.app"
VERSION="1.0.1"
ZIP="$DIST/$APP_NAME-$VERSION.zip"
DMG="$DIST/$APP_NAME-$VERSION.dmg"

SIGN_IDENTITY="Developer ID Application: Nikhil Anand (NW6B3R27LQ)"
APPLE_ID="nik.anand.1998@gmail.com"
APPLE_PASSWORD="qysf-exrb-xjmt-mxcp"
APPLE_TEAM_ID="NW6B3R27LQ"

echo "==> Building Swift release binary..."
swift build -c release

rm -rf "$APP" "$ZIP" "$DMG"
mkdir -p "$DIST"
mkdir -p "$APP/Contents/MacOS" "$APP/Contents/Resources"

cp "$(swift build -c release --show-bin-path)/$APP_NAME" "$APP/Contents/MacOS/$APP_NAME"
cp "$REPO_ROOT/Resources/AppIcon.icns" "$APP/Contents/Resources/AppIcon.icns"

cat > "$APP/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>PromptImprover</string>
    <key>CFBundleIdentifier</key>
    <string>ai.factory.promptimprover</string>
    <key>CFBundleName</key>
    <string>Prompt Improver</string>
    <key>CFBundleDisplayName</key>
    <string>Prompt Improver</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.1</string>
    <key>CFBundleVersion</key>
    <string>2</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2026 Factory. All rights reserved.</string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

echo "==> Signing app bundle with Developer ID + hardened runtime..."
codesign --deep --force --verify --verbose \
    --sign "$SIGN_IDENTITY" \
    --options runtime \
    --entitlements "$REPO_ROOT/Resources/entitlements.plist" \
    --timestamp \
    "$APP"

echo "==> Creating zip archive for notarization & distribution..."
ditto -c -k --keepParent "$APP" "$ZIP"

echo "==> Submitting app zip to Apple notary service..."
xcrun notarytool submit "$ZIP" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait

echo "==> Stapling notarization ticket to .app..."
xcrun stapler staple "$APP"

echo "==> Creating DMG..."
STAGE="$DIST/dmg-stage"
rm -rf "$STAGE"
mkdir -p "$STAGE"
cp -R "$APP" "$STAGE/"
create-dmg \
    --volname "Prompt Improver" \
    --window-pos 200 120 \
    --window-size 600 400 \
    --icon-size 100 \
    --icon "PromptImprover.app" 175 190 \
    --hide-extension "PromptImprover.app" \
    --app-drop-link 425 190 \
    --no-internet-enable \
    "$DMG" \
    "$STAGE" || {
        echo "create-dmg exited with code $?, checking DMG..."
        test -f "$DMG"
    }
rm -rf "$STAGE"

echo "==> Signing DMG..."
codesign --force --sign "$SIGN_IDENTITY" --timestamp "$DMG"

echo "==> Submitting DMG to Apple notary service..."
xcrun notarytool submit "$DMG" \
    --apple-id "$APPLE_ID" \
    --password "$APPLE_PASSWORD" \
    --team-id "$APPLE_TEAM_ID" \
    --wait

echo "==> Stapling notarization ticket to .dmg..."
xcrun stapler staple "$DMG"

# Re-create zip from stapled app
rm -f "$ZIP"
ditto -c -k --keepParent "$APP" "$ZIP"

echo "==> Validating Gatekeeper assessment..."
spctl --assess -vv --type execute "$APP"

echo "==> Packaging complete!"
ls -la "$DIST"
