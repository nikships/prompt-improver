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

## Install

Download the latest signed and notarized `PromptImprover.dmg` from [Releases](../../releases), drag it to Applications, and open it.

**Requirements:** macOS 14+, and the [droid](https://docs.factory.ai) CLI installed and signed in.

## Build from source

```sh
swift run                 # run the debug build
./Scripts/build-app.sh    # assemble dist/PromptImprover.app
```
