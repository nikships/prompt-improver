# Prompt Improver

A lightweight native macOS app (SwiftUI, Swift Package Manager) that turns rough draft prompts into polished, repository-grounded prompts using `droid exec`.

## Usage

1. **Select Repository…** and pick a local repo.
2. Type a draft prompt in the notepad area.
3. Click **Improve** (or press ⌘↩).

The app runs `droid exec` in read-only mode inside the selected repository. Droid does a fast, shallow scan (README, top-level structure, manifests) and rewrites the draft into a single, final prompt that is grounded in the repo's actual stack and conventions, emphasizes good UX and coding patterns, and includes actionable constraints and acceptance criteria. Specific files are referenced only when confidence is high.

Use **Copy** to grab the result, or **Use as Draft** to iterate on it.

The last selected repository is remembered across launches.

## Requirements

- macOS 14+
- The [`droid` CLI](https://docs.factory.ai) on your PATH (common install locations are also checked directly, so launching from Finder works)

## Build and run

```sh
swift run
```
