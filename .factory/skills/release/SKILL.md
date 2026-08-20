---
name: release
version: 1.0.0
description: |
  Cut a signed, notarized Prompt Improver GitHub release and replace the
  installed macOS app. Use when the user wants to release, ship, publish,
  notarize, tag, set GitHub latest, or update /Applications/Prompt Improver.app.
  Covers version bump, electron-builder packaging, Apple notarization/stapling,
  GitHub release creation, and local Applications replacement. Do not use for
  feature development, prompt work, or tests.
---

# Prompt Improver release

Ship a signed, notarized macOS build as GitHub **latest**, then replace the
installed app. This skill starts **after product work is already committed**.
Do not implement features, rewrite prompts, or add tests here.

## Prerequisites

- Clean enough working tree that only the version bump (and this skill, if
  uncommitted) is going out with the release
- On `master`, `gh` authenticated to `nikships/prompt-improver`
- Developer ID identity in the login keychain:
  `Developer ID Application: Nikhil Anand (NW6B3R27LQ)`
- Notarization env is already set inside `Scripts/release-package.sh`
  (`APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID=NW6B3R27LQ`)
- Do not recall or paste those credentials into the skill, commit message,
  or GitHub notes

## Facts

- Version lives in `package.json` (and `package-lock.json`)
- Bundle id: `ai.factory.promptimprover`
- Product name / install path: `/Applications/Prompt Improver.app`
  (space in the name; **not** the old Swift `/Applications/PromptImprover.app`)
- Artifacts:
  - `dist/mac-arm64/Prompt Improver.app`
  - `dist/PromptImprover-<ver>.dmg`
  - `dist/PromptImprover-<ver>.zip`
- `electron-builder.yml` `mac.identity` must be `Nikhil Anand (NW6B3R27LQ)`
  **without** the `Developer ID Application:` prefix (builder rejects the prefix)
- `gh release create` on this `gh` needs `--notes-file`, not `--body-file`

## Steps

### 1. Choose the version

```bash
gh release list --limit 5
node -p "require('./package.json').version"
git log --oneline origin/master..HEAD
```

Bump **minor** for user-facing behavior, **patch** for packaging/fixes.
Do not publish `0.x` after 1.0.1. The Electron rewrite starts at 2.0.0.

### 2. Bump, commit, keep product commits out of this step

```bash
npm version X.Y.Z --no-git-tag-version
git add package.json package-lock.json
git commit -m "chore(release): bump version to X.Y.Z"
```

Pre-commit runs typecheck, lint, and tests. Fix hook failures before
continuing. Do not mix this commit with feature files.

### 3. Sign, notarize, staple

```bash
./Scripts/release-package.sh
```

(`make release` is the same.) This:

1. Runs `npm run package` (`electron-vite` build + `electron-builder --mac --arm64 --publish never`)
2. Codesigns with Developer ID
3. Lets electron-builder notarize the `.app` (often succeeds)
4. Staples the `.app`
5. Tries to staple the `.dmg`. If stapler error 65 / "Record not found",
   **expected**: the script submits the DMG to `notarytool --wait` and staples
6. Recreates the zip from the **stapled** `.app` via `ditto`
7. Verifies `codesign --verify --deep --strict` and
   `spctl --assess -vv --type execute`

Allow several minutes. Do not skip the DMG fallback.

Success looks like:

```
notarization successful
The staple and validate action worked!
...app: accepted
source=Notarized Developer ID
origin=Developer ID Application: Nikhil Anand (NW6B3R27LQ)
```

### 4. Tag, push, publish GitHub latest

Write notes to a temp file. Include what shipped, signed/notarized status,
macOS 14+ / Apple Silicon / `droid` CLI requirements, and the two download names.

```bash
NOTES=$(mktemp)
# write notes into $NOTES

git tag -a vX.Y.Z -m "Prompt Improver X.Y.Z"
git push origin master
git push origin vX.Y.Z
gh release create vX.Y.Z \
  --title "Prompt Improver X.Y.Z" \
  --notes-file "$NOTES" \
  --latest \
  dist/PromptImprover-X.Y.Z.dmg \
  dist/PromptImprover-X.Y.Z.zip
rm -f "$NOTES"
gh release view vX.Y.Z
```

`--latest` is required so this replaces the previous GitHub latest.

### 5. Replace the installed app

```bash
osascript -e 'tell application "Prompt Improver" to quit' 2>/dev/null || true
sleep 1
rm -rf "/Applications/Prompt Improver.app"
ditto "dist/mac-arm64/Prompt Improver.app" "/Applications/Prompt Improver.app"
defaults read "/Applications/Prompt Improver.app/Contents/Info" CFBundleShortVersionString
codesign --verify --deep --strict --verbose=2 "/Applications/Prompt Improver.app"
spctl --assess -vv --type execute "/Applications/Prompt Improver.app"
```

Installed version string must equal `X.Y.Z`. Gatekeeper must still report
`accepted` / `Notarized Developer ID`.

## Verify it worked

- https://github.com/nikships/prompt-improver/releases/tag/vX.Y.Z is published
- Release is **Latest**
- `PromptImprover-X.Y.Z.dmg` and `.zip` are attached
- `/Applications/Prompt Improver.app` version is `X.Y.Z`
- `spctl --assess -vv --type execute` on the installed app is accepted

## What not to do

- Do not use leftover Swift `Scripts/build-app.sh`, SwiftPM, or
  `/Applications/PromptImprover.app`
- Do not put `Developer ID Application:` in `electron-builder.yml` `identity`
- Do not use `gh release create --body-file` (this `gh` wants `--notes-file`)
- Do not skip DMG `notarytool` fallback when stapler cannot find a ticket
- Do not recreate the zip **before** stapling the `.app`
- Do not commit `dist/`, `out/`, or notarization credentials
- Do not start this skill until the product change is already on `master`
  (or included in the commits you are about to push with the version bump)
