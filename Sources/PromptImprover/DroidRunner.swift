import Foundation
import os

enum DroidRunnerError: LocalizedError {
    case droidNotFound
    case launchFailed(String)
    case executionFailed(exitCode: Int32, stderr: String)
    case emptyResult
    case unparseableOutput(String)

    var errorDescription: String? {
        switch self {
        case .droidNotFound:
            return "Could not find the `droid` CLI. Install it and make sure it is on your PATH."
        case .launchFailed(let message):
            return "Failed to launch droid: \(message)"
        case .executionFailed(let exitCode, let stderr):
            let detail = stderr.trimmingCharacters(in: .whitespacesAndNewlines)
            return "droid exec exited with code \(exitCode)." + (detail.isEmpty ? "" : "\n\(detail)")
        case .emptyResult:
            return "droid exec finished but returned an empty result."
        case .unparseableOutput(let output):
            let preview = output.prefix(300)
            return "Could not parse droid exec output:\n\(preview)"
        }
    }
}

/// Runs `droid exec` in read-only mode against a repository and returns the
/// improved prompt produced by the model.
struct DroidRunner {

    private static let improvementInstructions = """
    You are a prompt engineer. Your job is to rewrite the user's draft prompt into a single, \
    polished, ready-to-use prompt for an AI coding agent working in this repository.

    First, take a quick look at the repository you are running in: skim the README, the top-level \
    structure, the manifest/config files, and whatever reveals the languages, frameworks, and \
    conventions in use. Keep this scan fast and shallow. Do not do a deep, file-by-file dive.

    Then rewrite the draft prompt so that it:
    - States the goal and desired outcome clearly and unambiguously.
    - Is grounded in this repository: correct terminology, actual tech stack, real conventions.
    - Emphasizes good UX and good coding patterns appropriate to this codebase.
    - Includes sensible constraints and acceptance criteria the agent can act on.
    - Mentions specific files or directories ONLY if you are highly confident they are relevant. \
    This is optional; leave them out when unsure.
    - Does NOT prescribe specific edits or line-level changes.

    Output ONLY the final improved prompt text, with no preamble, commentary, headers about what \
    you did, or code fences around the whole answer. The output must be immediately usable as-is.

    Draft prompt to improve:
    ---
    """

    /// Locates the droid binary, checking common install locations first and
    /// falling back to a login-shell lookup (GUI apps inherit a minimal PATH).
    static func findDroid() -> String? {
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let candidates = [
            "\(home)/.npm-global/bin/droid",
            "\(home)/.local/bin/droid",
            "/opt/homebrew/bin/droid",
            "/usr/local/bin/droid",
        ]
        for path in candidates where FileManager.default.isExecutableFile(atPath: path) {
            return path
        }

        let lookup = Process()
        lookup.executableURL = URL(fileURLWithPath: "/bin/zsh")
        lookup.arguments = ["-lc", "command -v droid"]
        let pipe = Pipe()
        lookup.standardOutput = pipe
        lookup.standardError = Pipe()
        do {
            try lookup.run()
            lookup.waitUntilExit()
            guard lookup.terminationStatus == 0 else { return nil }
            let data = pipe.fileHandleForReading.readDataToEndOfFile()
            let path = String(decoding: data, as: UTF8.self)
                .trimmingCharacters(in: .whitespacesAndNewlines)
            return path.isEmpty ? nil : path
        } catch {
            return nil
        }
    }

    static func improve(prompt: String, repository: URL, modelId: String = "") async throws -> String {
        guard let droidPath = findDroid() else {
            throw DroidRunnerError.droidNotFound
        }

        let promptFile = FileManager.default.temporaryDirectory
            .appendingPathComponent("prompt-improver-\(UUID().uuidString).md")
        let fullPrompt = improvementInstructions + "\n" + prompt + "\n---\n"
        try fullPrompt.write(to: promptFile, atomically: true, encoding: .utf8)
        defer { try? FileManager.default.removeItem(at: promptFile) }

        let process = Process()
        process.executableURL = URL(fileURLWithPath: droidPath)
        // Default autonomy is read-only, which is exactly right: droid may
        // scan the repository but never modify it.
        var arguments = [
            "exec",
            "--cwd", repository.path,
            "-o", "json",
            "-f", promptFile.path,
        ]
        if !modelId.isEmpty {
            arguments += ["-m", modelId]
        }
        process.arguments = arguments
        process.currentDirectoryURL = repository

        var environment = ProcessInfo.processInfo.environment
        let home = FileManager.default.homeDirectoryForCurrentUser.path
        let extraPaths = [
            "\(home)/.npm-global/bin",
            "\(home)/.local/bin",
            "/opt/homebrew/bin",
            "/usr/local/bin",
        ]
        let basePath = environment["PATH"] ?? "/usr/bin:/bin"
        environment["PATH"] = (extraPaths + [basePath]).joined(separator: ":")
        process.environment = environment

        let stdoutPipe = Pipe()
        let stderrPipe = Pipe()
        process.standardOutput = stdoutPipe
        process.standardError = stderrPipe

        do {
            try process.run()
        } catch {
            throw DroidRunnerError.launchFailed(error.localizedDescription)
        }

        // Drain pipes concurrently to avoid deadlock on large outputs.
        async let stdoutData = readToEnd(stdoutPipe)
        async let stderrData = readToEnd(stderrPipe)

        // Cancelling the surrounding task must kill the child, otherwise a
        // cancelled improvement keeps droid running (and billing) invisibly.
        await withTaskCancellationHandler {
            await withCheckedContinuation { (continuation: CheckedContinuation<Void, Never>) in
                let resumed = OSAllocatedUnfairLock(initialState: false)
                let resumeOnce = {
                    let isFirst = resumed.withLock { done -> Bool in
                        if done { return false }
                        done = true
                        return true
                    }
                    if isFirst { continuation.resume() }
                }
                process.terminationHandler = { _ in resumeOnce() }
                // The handler is not called if the process already exited
                // before it was installed, so check once ourselves.
                if !process.isRunning { resumeOnce() }
            }
        } onCancel: {
            process.terminate()
        }

        let stdout = String(decoding: await stdoutData, as: UTF8.self)
        let stderr = String(decoding: await stderrData, as: UTF8.self)

        try Task.checkCancellation()

        guard process.terminationStatus == 0 else {
            if stderr.contains("Model blocked by organization policy") {
                throw DroidRunnerError.executionFailed(
                    exitCode: process.terminationStatus,
                    stderr: "This model is blocked by organization policy. Pick a different model.")
            }
            throw DroidRunnerError.executionFailed(
                exitCode: process.terminationStatus, stderr: stderr)
        }

        return try parseResult(from: stdout)
    }

    private static func readToEnd(_ pipe: Pipe) async -> Data {
        await withCheckedContinuation { continuation in
            DispatchQueue.global(qos: .userInitiated).async {
                let data = pipe.fileHandleForReading.readDataToEndOfFile()
                continuation.resume(returning: data)
            }
        }
    }

    /// `-o json` emits a single terminal object with a `result` key; the
    /// streaming format uses `finalText` instead, so accept both.
    private static func parseResult(from stdout: String) throws -> String {
        let trimmed = stdout.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { throw DroidRunnerError.emptyResult }

        for line in trimmed.split(separator: "\n").reversed() {
            guard let data = line.data(using: .utf8),
                  let object = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
            else { continue }

            if let isError = object["is_error"] as? Bool, isError {
                let message = (object["result"] as? String) ?? "unknown error"
                throw DroidRunnerError.executionFailed(exitCode: 0, stderr: message)
            }
            if let result = (object["result"] as? String) ?? (object["finalText"] as? String) {
                let cleaned = result.trimmingCharacters(in: .whitespacesAndNewlines)
                if cleaned.isEmpty { throw DroidRunnerError.emptyResult }
                return cleaned
            }
        }
        throw DroidRunnerError.unparseableOutput(trimmed)
    }
}
