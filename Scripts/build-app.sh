#!/bin/zsh
# Builds PromptImprover.app into dist/ from the SwiftPM release binary.
set -euo pipefail

cd "$(dirname "$0")/.."
REPO_ROOT="$PWD"
APP_NAME="PromptImprover"
DIST="$REPO_ROOT/dist"
APP="$DIST/$APP_NAME.app"

swift build -c release

rm -rf "$APP"
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
    <string>1.0</string>
    <key>CFBundleVersion</key>
    <string>1</string>
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    <key>LSMinimumSystemVersion</key>
    <string>14.0</string>
    <key>NSHumanReadableCopyright</key>
    <string></string>
    <key>NSHighResolutionCapable</key>
    <true/>
</dict>
</plist>
PLIST

codesign --force --sign - "$APP"

echo "Built $APP"
