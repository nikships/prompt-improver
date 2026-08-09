import SwiftUI
import AppKit
import UniformTypeIdentifiers

@MainActor
final class ImproverViewModel: ObservableObject {
    @Published var repositoryURL: URL? {
        didSet {
            if let url = repositoryURL {
                UserDefaults.standard.set(url.path, forKey: Self.repoDefaultsKey)
            }
        }
    }
    @Published var prompt: String = ""
    @Published var improvedPrompt: String = ""
    @Published var isImproving: Bool = false
    @Published var errorMessage: String?
    @Published var didCopy: Bool = false

    private static let repoDefaultsKey = "lastRepositoryPath"
    private var improveTask: Task<Void, Never>?

    init() {
        if let saved = UserDefaults.standard.string(forKey: Self.repoDefaultsKey),
           FileManager.default.fileExists(atPath: saved) {
            repositoryURL = URL(fileURLWithPath: saved)
        }
    }

    var canImprove: Bool {
        repositoryURL != nil
            && !prompt.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            && !isImproving
    }

    func chooseRepository() {
        let panel = NSOpenPanel()
        panel.title = "Select Repository"
        panel.message = "Choose the local repository the prompt is about."
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.directoryURL = repositoryURL
        if panel.runModal() == .OK, let url = panel.url {
            repositoryURL = url
        }
    }

    func improve() {
        guard canImprove, let repo = repositoryURL else { return }
        let draft = prompt
        isImproving = true
        errorMessage = nil
        didCopy = false

        improveTask = Task {
            do {
                let result = try await DroidRunner.improve(prompt: draft, repository: repo)
                guard !Task.isCancelled else { return }
                improvedPrompt = result
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
            isImproving = false
        }
    }

    func cancelImprove() {
        improveTask?.cancel()
        improveTask = nil
        isImproving = false
    }

    func copyImprovedPrompt() {
        guard !improvedPrompt.isEmpty else { return }
        NSPasteboard.general.clearContents()
        NSPasteboard.general.setString(improvedPrompt, forType: .string)
        didCopy = true
        Task {
            try? await Task.sleep(for: .seconds(2))
            didCopy = false
        }
    }

    func useImprovedAsDraft() {
        guard !improvedPrompt.isEmpty else { return }
        prompt = improvedPrompt
        improvedPrompt = ""
    }
}

struct ContentView: View {
    @StateObject private var model = ImproverViewModel()

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            repositoryRow
            promptSection
            actionRow
            if let error = model.errorMessage {
                errorBanner(error)
            }
            resultSection
        }
        .padding(16)
    }

    private var repositoryRow: some View {
        HStack(spacing: 8) {
            Image(systemName: "folder")
                .foregroundStyle(.secondary)
            if let repo = model.repositoryURL {
                Text(repo.path)
                    .lineLimit(1)
                    .truncationMode(.middle)
                    .help(repo.path)
            } else {
                Text("No repository selected")
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Button("Select Repository…") {
                model.chooseRepository()
            }
        }
    }

    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text("Prompt")
                .font(.headline)
            TextEditor(text: $model.prompt)
                .font(.body.monospaced())
                .scrollContentBackground(.hidden)
                .padding(6)
                .background(Color(nsColor: .textBackgroundColor))
                .clipShape(RoundedRectangle(cornerRadius: 6))
                .overlay(
                    RoundedRectangle(cornerRadius: 6)
                        .strokeBorder(Color(nsColor: .separatorColor))
                )
                .frame(minHeight: 140)
                .overlay(alignment: .topLeading) {
                    if model.prompt.isEmpty {
                        Text("Describe what you want the AI to do…")
                            .foregroundStyle(.tertiary)
                            .padding(.top, 10)
                            .padding(.leading, 12)
                            .allowsHitTesting(false)
                    }
                }
        }
    }

    private var actionRow: some View {
        HStack(spacing: 12) {
            if model.isImproving {
                Button("Cancel") {
                    model.cancelImprove()
                }
                ProgressView()
                    .controlSize(.small)
                Text("Scanning repository and improving prompt…")
                    .font(.callout)
                    .foregroundStyle(.secondary)
            } else {
                Button {
                    model.improve()
                } label: {
                    Label("Improve", systemImage: "wand.and.stars")
                }
                .keyboardShortcut(.return, modifiers: .command)
                .buttonStyle(.borderedProminent)
                .disabled(!model.canImprove)
                Text("⌘↩")
                    .font(.caption)
                    .foregroundStyle(.tertiary)
            }
            Spacer()
        }
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .foregroundStyle(.yellow)
            Text(message)
                .font(.callout)
                .textSelection(.enabled)
            Spacer()
            Button {
                model.errorMessage = nil
            } label: {
                Image(systemName: "xmark")
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(.yellow.opacity(0.12))
        .clipShape(RoundedRectangle(cornerRadius: 6))
    }

    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text("Improved Prompt")
                    .font(.headline)
                Spacer()
                if !model.improvedPrompt.isEmpty {
                    Button(model.didCopy ? "Copied" : "Copy") {
                        model.copyImprovedPrompt()
                    }
                    Button("Use as Draft") {
                        model.useImprovedAsDraft()
                    }
                }
            }
            ScrollView {
                Text(model.improvedPrompt.isEmpty
                     ? "The improved prompt will appear here."
                     : model.improvedPrompt)
                    .font(.body.monospaced())
                    .foregroundStyle(model.improvedPrompt.isEmpty ? .tertiary : .primary)
                    .textSelection(.enabled)
                    .frame(maxWidth: .infinity, alignment: .topLeading)
                    .padding(10)
            }
            .background(Color(nsColor: .textBackgroundColor))
            .clipShape(RoundedRectangle(cornerRadius: 6))
            .overlay(
                RoundedRectangle(cornerRadius: 6)
                    .strokeBorder(Color(nsColor: .separatorColor))
            )
            .frame(minHeight: 180, maxHeight: .infinity)
        }
    }
}
