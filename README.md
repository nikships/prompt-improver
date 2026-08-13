<p align="center">
  <picture>
    <source media="(prefers-color-scheme: dark)" srcset="docs/assets/factory-logo-dark.svg">
    <img src="docs/assets/factory-logo.svg" alt="Factory" width="180">
  </picture>
</p>

<h1 align="center">Prompt Improver</h1>

<p align="center">
  <img src="docs/assets/app-icon.png" alt="Prompt Improver icon" width="128">
</p>

<p align="center">
  A lightweight native macOS app that turns rough draft prompts into polished,<br>
  repository-grounded prompts using Factory's <a href="https://docs.factory.ai">droid</a> CLI.
</p>

<p align="center">
  <img src="docs/assets/screenshot.png" alt="Prompt Improver screenshot" width="720">
</p>

## How it works

1. Choose a local repository (or drag & drop a folder anywhere in the window).
2. Type a draft prompt in the notepad area.
3. Pick a model (optional; your choice is saved as the default).
4. Click **Improve** (⌘↩).

The app runs `droid exec` in read-only mode inside the selected repository. Droid does a fast, shallow scan (README, top-level structure, manifests) and rewrites the draft into a single, final prompt that is grounded in the repo's actual stack and conventions, emphasizes good UX and coding patterns, and includes actionable constraints and acceptance criteria. Specific files are referenced only when confidence is high.

Use **Copy** to grab the result, or **Use as Draft** to iterate on it.

## Features

- OLED-black, modern dark UI
- Model picker sourced from your droid configuration (built-ins + custom models from `~/.factory/settings.json`), persisted across launches
- Live elapsed timer and true cancellation (the underlying droid process is terminated)
- Repository and model choices remembered between sessions
- Drag & drop repository selection

## Requirements

- **macOS 14+** and **Xcode 15+** (provides Swift 5.10 toolchain)
- **Swift 5.10+** (`swift --version`)
- **[droid CLI](https://docs.factory.ai)** installed and signed in (required at runtime for Improve)
- **SwiftLint** for linting: `brew install swiftlint`

## Install

Download the latest signed and notarized `PromptImprover.dmg` from [Releases](../../releases), drag it to Applications, and open it.

## Development — Setup (clone to running)

### Single-command setup

```sh
git clone git@github.com:nikships/prompt-improver.git
cd prompt-improver
./Scripts/setup.sh
# or: make setup
```

The setup script verifies tool prerequisites (Swift, SwiftLint, droid CLI), sets up git hooks, builds the package, and runs the test suite with coverage verification.

### Step-by-step setup

```sh
# 1. Clone
git clone git@github.com:nikships/prompt-improver.git
cd prompt-improver

# 2. Build
swift build

# 3. Run (debug)
swift run

# 4. Test & Coverage
swift test --enable-code-coverage
./Scripts/check-coverage.sh

# 5. Lint
brew install swiftlint
swiftlint lint --strict
```

Every command above is also run in CI — keep `swift build`, `swift test`, and `swiftlint` green before pushing.

## Build from source

```sh
swift build                 # debug build
swift build -c release      # release binary at .build/release/PromptImprover
swift run                   # run the debug build
./Scripts/build-app.sh      # assemble dist/PromptImprover.app (release + Info.plist + ad-hoc sign)
swift test                              # run tests
swift test --enable-code-coverage       # run tests with coverage
swiftlint                   # lint (also: swiftlint lint, CI uses swiftlint lint --strict)
swiftlint --fix             # auto-fix correctable violations
```

Release packaging (maintainers only, requires Developer ID + Apple notary credentials):

```sh
./Scripts/release-package.sh  # sign, notarize, and build DMG/ZIP into dist/
```

### Tests and coverage

```sh
swift test                              # run 36 tests
swift test --enable-code-coverage       # instrument + verify profdata is emitted
./Scripts/check-coverage.sh             # build, run tests, enforce thresholds
./Scripts/check-coverage.sh --no-build  # check existing profdata only

# Manual inspection
TEST_BIN=.build/out/Products/Debug/PromptImproverTests.xctest/Contents/MacOS/PromptImproverTests
PROF=.build/out/Products/Debug/codecov/default.profdata
xcrun llvm-cov report "$TEST_BIN" -instr-profile "$PROF"
xcrun llvm-cov show "$TEST_BIN" -instr-profile "$PROF" Sources/PromptImprover/ModelCatalog.swift
xcrun llvm-cov show "$TEST_BIN" -instr-profile "$PROF" Sources/PromptImprover/DroidRunner.swift
```

Enforced thresholds (`Scripts/check-coverage.sh`):

| Scope | Metric | Minimum |
|-------|--------|---------|
| `ModelCatalog.swift` | line cover | **90%** (currently 100%) |
| `TOTAL` (test binary, Sources + Tests) | line cover | **20%** (currently ~26%) |

The TOTAL is modest because UI code (`ContentView`, `LogoView`, `PromptImproverApp`) is not
unit-testable without a UI host; logic files themselves are well-covered. Adjust thresholds
upward as more logic is extracted from the view layer.
