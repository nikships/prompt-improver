<coding_guidelines>
# AGENTS.md — Prompt Improver

## Project overview

Prompt Improver is a native macOS Electron app (macOS 14+) built with React and TypeScript, powered by Factory's `@factory/droid-sdk`. It turns rough draft prompts into polished, repository-grounded prompts through an interactive multi-turn agent conversation.

The agent performs a shallow read-only scan of the selected repository, asks clarifying questions using the `AskUser` tool, and uses the answers to produce a ready-to-use prompt with correct stack terminology, UX/coding patterns, and actionable acceptance criteria.

- Electron desktop app with sandboxed React TypeScript renderer and Node main process
- Droid integration via `@factory/droid-sdk/node` using in-process `createSession` and streaming
- Interactive `askUserHandler` parked over typed IPC and rendered as a one-question-at-a-time questionnaire
- App bundled and packaged with `electron-vite` and `electron-builder`
- Default git branch is `master`

## Structure

```
.
├── electron.vite.config.ts           # electron-vite build & dev configuration
├── electron-builder.yml              # macOS app packaging configuration
├── package.json                      # npm package & dependencies
├── tsconfig.json                     # TypeScript configuration
├── eslint.config.js                  # ESLint configuration
├── vitest.config.ts                  # Vitest test and coverage configuration
├── src/
│   ├── main/                         # Electron main process (Node)
│   │   ├── main.ts                   # Window lifecycle & app initialization
│   │   ├── ipc.ts                    # Typed IPC handlers & state push
│   │   ├── env.ts                    # Login-shell PATH resolution
│   │   ├── prefs.ts                  # Preferences persistence (repo, model, reasoning)
│   │   ├── models.ts                 # Model catalog (builtins + ~/.factory/settings.json)
│   │   └── droid/
│   │       ├── session.ts            # DroidSession runner, streaming, state machine, cancel
│   │       ├── ask-user.ts           # AskUser request parser, park/resume, answer validator
│   │       ├── permissions.ts        # Read-only permission handler
│   │       ├── prompt.ts             # Two-phase prompt engineering instructions
│   │       └── find-droid.ts         # Droid CLI binary locator
│   ├── preload/
│   │   └── bridge.ts                 # Sandboxed contextBridge API for renderer
│   ├── shared/
│   │   ├── types.ts                  # Shared state, ask, model, and prefs types
│   │   └── ipc-contract.ts           # IPC channels and ImproverApi interface
│   └── renderer/                     # React UI (sandboxed)
│       ├── index.html                # App HTML entry point
│       ├── main.tsx                  # React DOM root
│       ├── App.tsx                   # Screen router (compose -> session -> result)
│       ├── store/
│       │   └── improver.tsx          # Live state store & action hooks
│       ├── screens/
│       │   ├── ComposeScreen.tsx     # Screen 1: Draft input, repo picker, model/reasoning
│       │   ├── SessionScreen.tsx     # Screen 2: Scanning activity & interactive Questionnaire
│       │   └── ResultScreen.tsx      # Screen 3: Improved prompt, copy, draft-use, Q&A recap
│       ├── components/
│       │   ├── Logo.tsx              # Factory logo & Droid glyph SVGs
│       │   ├── SectionLabel.tsx      # Uppercase mono section labels (e.g. "01 / DRAFT")
│       │   ├── RepoPicker.tsx        # Folder selector & drop target chip
│       │   ├── ModelSelect.tsx       # Model dropdown selector
│       │   ├── ReasoningSelect.tsx   # Reasoning effort dropdown selector
│       │   ├── Questionnaire.tsx     # One-at-a-time wizard with single/multi/custom answers
│       │   ├── QuestionCard.tsx      # Question card with keyboard shortcuts (1-9, enter)
│       │   ├── ActivityStack.tsx     # Live quiet tool activity stack
│       │   ├── ErrorBanner.tsx       # Danger error banner with retry/edit actions
│       │   └── ui/Button.tsx         # Primary, ghost, and accent styled buttons
│       └── styles/
│           ├── tokens.css            # Factory OLED design tokens
│           └── global.css            # Global typography and base styles
├── tests/                            # Unit & integration test suites
│   ├── ask-user.test.ts              # AskUser payload parser and answer completion tests
│   ├── permissions.test.ts           # Read-only permission validation tests
│   ├── models.test.ts                # Model catalog & settings.json tests
│   ├── prefs.test.ts                 # Preferences persistence tests
│   ├── session.test.ts               # Multi-turn session & AskUser mock runner tests
│   ├── find-droid.test.ts            # Droid CLI discovery tests
│   └── env.test.ts                   # Environment PATH resolution tests
├── assets/                           # App icons and packaging resources
├── docs/assets/                      # README logos and screenshots
└── Scripts/
    ├── setup.sh                      # Single-command setup and prerequisites check
    └── install-hooks.sh              # Git hooks installer
```

## Environment requirements

- **macOS 14+** (Sonoma or newer)
- **Node.js 20+ or 22+** (`node --version`)
- **npm 10+** (`npm --version`)
- **droid CLI** installed and authenticated (`droid --version`, `droid auth status`)

## Commands

All commands run from repo root. `make` shortcuts are provided in `Makefile`.

### Setup

```sh
./Scripts/setup.sh
# or via make:
make setup
```

### Development

```sh
npm run dev                 # launch app in development mode with HMR (or: make dev)
```

### Typecheck

```sh
npm run typecheck           # run TypeScript compiler typecheck (or: make typecheck)
```

### Test and Coverage

```sh
npm test                    # run unit test suite (or: make test)
npm run test:coverage       # run tests with v8 code coverage enforcement (or: make coverage)
```

Enforced coverage threshold:
- Lines coverage >= **80%** on `src/main/**` core logic

### Lint / Format

```sh
npm run lint                # run ESLint with strict zero-warnings (or: make lint)
npm run lint:fix            # automatically fix lint formatting issues (or: make format)
```

### Full Verification Check

```sh
npm run check               # runs typecheck, lint, test, and build (or: make check)
```

### Packaging / Distribution

```sh
npm run package             # builds and packages macOS arm64 DMG and ZIP (or: make package)
```

## Architecture & Conventions

- **Main Process (`src/main`)**:
  - Direct integration with `@factory/droid-sdk/node` using `createSession`.
  - Permissions strictly enforce read-only execution: `Read`, `Grep`, `Glob`, `LS`, `AskUser`, `TodoWrite` are allowed; modifying tools (`Execute`, `Create`, `Edit`, `ApplyPatch`) are blocked.
  - Interactive `askUserHandler` parks the request, notifies renderer via `improver:state`, and resolves when the user submits answers.
  - Session cancellation interrupts and closes the SDK session immediately.
  - Preferences persist last repository, selected model, and reasoning effort.
- **Renderer (`src/renderer`)**:
  - Sandboxed React application communicating with main only via typed `window.improver` bridge.
  - Three-screen flow:
    1. **Compose**: Draft editor, repository selector (with folder drag-and-drop), model and reasoning pickers. No empty output pane.
    2. **Session**: Top context bar, live activity stack during scanning, one-question-at-a-time questionnaire during `asking` phase.
    3. **Result**: Final ready-to-use prompt, one-click copy, use-as-draft, new prompt, and collapsible Q&A recap.
- **Styling**: Factory OLED theme (`#020202` background, `#0A0A0A` surface, `#101010` raised surface, `#EE6018` Factory orange accent, monospace uppercase labels).
- **Security**: Sandboxing enabled, context isolation enabled, node integration disabled, no hardcoded API keys or credentials.
</coding_guidelines>
