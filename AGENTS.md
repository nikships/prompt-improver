# AGENTS.md — Prompt Improver

## Project overview

Prompt Improver is a native macOS SwiftUI app (macOS 14+) that turns rough draft prompts into polished, repository-grounded prompts. It does this by running Factory's `droid exec` in read-only mode inside a user-selected repository — droid does a fast shallow scan (README, top-level structure, manifests) and rewrites the draft into a final prompt with correct stack terminology, UX/coding guidance, and actionable acceptance criteria.

- SwiftPM executable package (`Package.swift`, swift-tools-version 5.10)
- Single target: `PromptImprover` at `Sources/PromptImprover/`
- No external Swift dependencies; wraps the `droid` CLI at runtime
- App bundle assembled by `Scripts/build-app.sh` into `dist/PromptImprover.app`
- Release packaging (sign + notarize + DMG) via `Scripts/release-package.sh` (contains hardcoded Apple credentials — do not log or commit secrets)
- Default git branch is `master`

## Structure

```
.
├── Package.swift                     # SwiftPM executable, platforms: .macOS(.v14)
├── Sources/PromptImprover/
│   ├── PromptImproverApp.swift       # App entry point
│   ├── ContentView.swift             # Main UI (OLED dark theme)
│   ├── Theme.swift                   # Design tokens / colors
│   ├── LogoView.swift                # Factory branding + logo
│   ├── DroidRunner.swift             # `droid exec` integration, cancellation, JSON parsing
│   └── ModelCatalog.swift            # Model picker (reads ~/.factory/settings.json)
├── Resources/
│   ├── AppIcon.icns                  # App icon
│   └── entitlements.plist            # Hardened runtime entitlements (release signing)
├── Scripts/
│   ├── build-app.sh                  # Assembles dist/PromptImprover.app (debug/release)
│   └── release-package.sh            # Full sign/notarize/DMG pipeline (requires Apple creds)
├── docs/assets/                      # README assets (logo, app-icon, screenshot)
└── .github/                          # PR and issue templates
```

This is a single-package repo, not a monorepo — root `AGENTS.md` is authoritative. No nested `AGENTS.md` is needed under `Sources/`.

## Environment requirements

- **macOS 14+** (LSMinimumSystemVersion 14.0, built against macOS 14 SDK)
- **Xcode 15+** (provides Swift 5.10 toolchain; CLI tools must be selected: `xcode-select -p`)
- **Swift 5.10+** (`swift --version`)
- **droid CLI** installed and authenticated (`droid --version`, `droid auth status` or `droid exec --help`). App locates `droid` via `~/.npm-global/bin/droid`, `~/.local/bin/droid`, `/opt/homebrew/bin/droid`, `/usr/local/bin/droid`, then `command -v droid` in a login shell.
- **SwiftLint** (optional but required for lint CI): `brew install swiftlint`

## Commands

All commands run from the repo root.

### Setup (clone to running)

```sh
git clone git@github.com:nikships/prompt-improver.git
cd prompt-improver
swift build
swift run
```

### Build

```sh
swift build                 # debug build
swift build -c release      # release binary at .build/release/PromptImprover
./Scripts/build-app.sh      # assemble dist/PromptImprover.app (release build + Info.plist + ad-hoc sign)
```

### Run

```sh
swift run                   # run debug build directly
open dist/PromptImprover.app  # after build-app.sh
```

### Test

```sh
swift test                              # run tests (if any)
swift test --enable-code-coverage       # with coverage; emits .build/.../codecov/*.json
```

Coverage is via SwiftPM + llvm-cov. To view a summary if `xccov`/`llvm-cov` is available:

```sh
swift test --enable-code-coverage
xcrun llvm-cov report .build/debug/PromptImproverPackageTests.xctest/Contents/MacOS/PromptImproverPackageTests \
  -instr-profile .build/debug/codecov/default.profdata 2>/dev/null || \
  xcrun xccov view --report .build 2>/dev/null || echo "Install Xcode CLI tools for coverage reports"
```

If `Scripts/coverage-check.sh` exists (CI checks for it), prefer it: `./Scripts/coverage-check.sh` (or `bash ./Scripts/coverage-check.sh` if not executable).

### Lint / Format

```sh
brew install swiftlint        # one-time
swiftlint                     # lint (uses .swiftlint.yml if present; else default rules)
swiftlint lint                # explicit subcommand, same as above
swiftlint lint --strict       # CI mode: warnings become errors
swiftlint --fix               # auto-fix correctable violations (review diff)
```

No SwiftFormat config is present; SwiftLint is the canonical linter. CI runs `swiftlint lint --strict`.

### Release (maintainers only)

```sh
./Scripts/release-package.sh  # build, sign, notarize, DMG — requires Developer ID + Apple notary creds
```

Do not run on CI or log its output; it contains hardcoded secrets pending rotation to env vars.

## Conventions

- **Swift / SwiftUI**: Target macOS 14, Swift 5.10. Prefer value types, `async/await`, and `ObservableObject`/`@State` as in `ContentView.swift`. Keep UI in `ContentView`/`Theme`/`LogoView`, process logic in `DroidRunner`.
- **Droid integration**: `DroidRunner` shells out to `droid exec --cwd <repo> -o json -f <promptFile> [-m <model>]`. It injects extra PATH entries and drains stdout/stderr concurrently to avoid deadlock. Cancellation must terminate the child process (`process.terminate()` in `withTaskCancellationHandler`). JSON parsing accepts both `result` and `finalText` keys and surfaces `is_error` as `DroidRunnerError`.
- **Error handling**: Use `LocalizedError` with user-facing `errorDescription` (see `DroidRunnerError`). Surface stderr trimmed, handle "Model blocked by organization policy" specially.
- **No environment files**: No `.env` / `.env.example` — `droid` auth is external (login via `droid` CLI). `DroidRunner` only manipulates `PATH` in-process; no secrets in repo.
- **Signing**: `build-app.sh` uses ad-hoc signing (`codesign --sign -`); `release-package.sh` uses Developer ID + hardened runtime + entitlements. Do not change bundle ID `ai.factory.promptimprover` without updating both scripts.
- **Linting**: Fix SwiftLint violations rather than disabling. Never add `// swiftlint:disable` without prior approval.
- **Commits**: Keep diffs focused; run `swift build` and `swiftlint` before pushing.

## PR guidance

- Base branch: `master`.
- Title: concise, imperative ("Add model picker persistence", not "Added...").
- Include: **Summary** (what/why), **Testing** (commands run + manual steps), **Checklist**, and **Screenshots** for any UI change (before/after, light/dark if relevant).
- Before opening:
  ```sh
  swift build
  swift test
  swiftlint
  ./Scripts/build-app.sh   # if touching app bundle, resources, or Info.plist
  ```
- Do not include `dist/`, `.build/`, `.swiftpm/`, or `.DS_Store` in PRs (see `.gitignore`).
- Do not create or commit `.agents/agent-ready.json`.
- Attach PR link to Linear issue when applicable: `orca linear attach --current --url <pr-url> --title "PR link" --json`.

## Monorepo hierarchy

N/A — single SwiftPM package. Root `AGENTS.md` is sufficient; no nested agents files.
