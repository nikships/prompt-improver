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
    @Published var elapsedSeconds: Int = 0
    @Published var selectedModelId: String {
        didSet {
            UserDefaults.standard.set(selectedModelId, forKey: Self.modelDefaultsKey)
        }
    }

    let availableModels: [ModelOption]

    private static let repoDefaultsKey = "lastRepositoryPath"
    private static let modelDefaultsKey = "selectedModelId"
    private var improveTask: Task<Void, Never>?
    private var timerTask: Task<Void, Never>?

    init() {
        let models = ModelCatalog.load()
        availableModels = models
        let savedModel = UserDefaults.standard.string(forKey: Self.modelDefaultsKey) ?? ""
        // Fall back to Default if the saved model no longer exists.
        selectedModelId = models.contains(where: { $0.id == savedModel }) ? savedModel : ""

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

    func setRepository(_ url: URL) {
        var isDirectory: ObjCBool = false
        guard FileManager.default.fileExists(atPath: url.path, isDirectory: &isDirectory),
              isDirectory.boolValue else {
            errorMessage = "\(url.lastPathComponent) is not a folder."
            return
        }
        repositoryURL = url
        errorMessage = nil
    }

    func improve() {
        guard canImprove, let repo = repositoryURL else { return }
        let draft = prompt
        isImproving = true
        errorMessage = nil
        didCopy = false
        startTimer()

        improveTask = Task {
            defer {
                isImproving = false
                stopTimer()
            }
            do {
                let result = try await DroidRunner.improve(
                    prompt: draft, repository: repo, modelId: selectedModelId)
                withAnimation(.easeOut(duration: 0.25)) {
                    improvedPrompt = result
                }
            } catch is CancellationError {
                // User cancelled; nothing to report.
            } catch {
                guard !Task.isCancelled else { return }
                errorMessage = error.localizedDescription
            }
        }
    }

    func cancelImprove() {
        improveTask?.cancel()
        improveTask = nil
        isImproving = false
        stopTimer()
    }

    private func startTimer() {
        elapsedSeconds = 0
        timerTask = Task {
            while !Task.isCancelled {
                try? await Task.sleep(for: .seconds(1))
                guard !Task.isCancelled else { return }
                elapsedSeconds += 1
            }
        }
    }

    private func stopTimer() {
        timerTask?.cancel()
        timerTask = nil
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
        withAnimation(.easeOut(duration: 0.2)) {
            prompt = improvedPrompt
            improvedPrompt = ""
        }
    }
}

struct ContentView: View {
    @StateObject private var model = ImproverViewModel()
    @State private var isDropTargeted = false
    @FocusState private var promptFocused: Bool

    var body: some View {
        VStack(alignment: .leading, spacing: 14) {
            titleBarSpacer
            repositoryRow
            promptSection
            actionRow
            if let error = model.errorMessage {
                errorBanner(error)
            }
            resultSection
        }
        .padding(.horizontal, 20)
        .padding(.bottom, 20)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(alignment: .top) {
            ZStack(alignment: .top) {
                Theme.background
                // Ambient accent glow bleeding from the top edge.
                Ellipse()
                    .fill(Theme.accentStart.opacity(0.16))
                    .frame(width: 460, height: 200)
                    .blur(radius: 90)
                    .offset(y: -120)
            }
            .ignoresSafeArea()
        }
        .onDrop(of: [.fileURL], isTargeted: $isDropTargeted) { providers in
            guard let provider = providers.first else { return false }
            _ = provider.loadObject(ofClass: URL.self) { url, _ in
                guard let url else { return }
                Task { @MainActor in
                    model.setRepository(url)
                }
            }
            return true
        }
        .overlay {
            if isDropTargeted {
                dropOverlay
            }
        }
    }

    // Room for the traffic lights over the hidden title bar.
    private var titleBarSpacer: some View {
        Color.clear.frame(height: 26)
    }

    private var dropOverlay: some View {
        RoundedRectangle(cornerRadius: 14)
            .strokeBorder(Theme.accentGradient, lineWidth: 2)
            .background(Theme.accentStart.opacity(0.06))
            .overlay {
                Label("Drop folder to select repository", systemImage: "folder.badge.plus")
                    .font(.system(size: 15, weight: .medium))
                    .foregroundStyle(Theme.textPrimary)
                    .padding(14)
                    .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: 10))
                    .overlay(
                        RoundedRectangle(cornerRadius: 10)
                            .strokeBorder(Theme.borderStrong, lineWidth: 1)
                    )
            }
            .padding(6)
            .allowsHitTesting(false)
    }

    private var repositoryRow: some View {
        VStack(alignment: .leading, spacing: 6) {
            HStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "folder.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(
                            model.repositoryURL != nil
                                ? AnyShapeStyle(Theme.accentGradient)
                                : AnyShapeStyle(Theme.textTertiary))
                    if let repo = model.repositoryURL {
                        Text(repo.path)
                            .font(.system(size: 12, weight: .medium, design: .monospaced))
                            .foregroundStyle(Theme.textPrimary.opacity(0.75))
                            .lineLimit(1)
                            .truncationMode(.middle)
                            .help(repo.path)
                    } else {
                        Text("No repository selected")
                            .font(.system(size: 12))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: 10).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: 10).strokeBorder(Theme.border, lineWidth: 1))

                Button("Choose…") {
                    model.chooseRepository()
                }
                .buttonStyle(GhostButtonStyle())
            }
            Text("or drag & drop a folder anywhere in this window")
                .font(.system(size: 11))
                .foregroundStyle(Theme.textTertiary)
                .padding(.leading, 4)
        }
    }

    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(text: "Prompt")
            TextEditor(text: $model.prompt)
                .font(.system(size: 13, design: .monospaced))
                .foregroundStyle(Theme.textPrimary)
                .scrollContentBackground(.hidden)
                .padding(10)
                .frame(minHeight: 150)
                .focused($promptFocused)
                .surfaceStyle(focused: promptFocused)
                .overlay(alignment: .topLeading) {
                    if model.prompt.isEmpty {
                        Text("Describe what you want the AI to do…")
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(Theme.textTertiary)
                            .padding(.top, 14)
                            .padding(.leading, 16)
                            .allowsHitTesting(false)
                    }
                }
        }
    }

    private var actionRow: some View {
        Group {
            if model.isImproving {
                HStack(spacing: 10) {
                    ProgressView()
                        .controlSize(.small)
                        .tint(Theme.accentStart)
                    Text("Scanning repository…")
                        .font(.system(size: 13))
                        .foregroundStyle(Theme.textPrimary.opacity(0.7))
                    Text("\(model.elapsedSeconds)s")
                        .font(.system(size: 12, design: .monospaced))
                        .foregroundStyle(Theme.textSecondary)
                        .monospacedDigit()
                        .contentTransition(.numericText())
                    Spacer()
                    Button("Cancel") {
                        model.cancelImprove()
                    }
                    .buttonStyle(GhostButtonStyle())
                }
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Theme.surface))
                .overlay(
                    RoundedRectangle(cornerRadius: Theme.corner)
                        .strokeBorder(Theme.border, lineWidth: 1)
                )
            } else {
                HStack(spacing: 12) {
                    Button {
                        model.improve()
                    } label: {
                        HStack(spacing: 7) {
                            Image(systemName: "sparkles")
                                .font(.system(size: 12, weight: .semibold))
                            Text("Improve")
                            Text("⌘↩")
                                .font(.system(size: 11, weight: .medium, design: .monospaced))
                                .foregroundStyle(.white.opacity(0.6))
                        }
                    }
                    .buttonStyle(GradientButtonStyle())
                    .keyboardShortcut(.return, modifiers: .command)
                    .disabled(!model.canImprove)
                    Text("Uses your repository for context")
                        .font(.system(size: 11))
                        .foregroundStyle(Theme.textTertiary)
                    Spacer()
                    modelPicker
                }
            }
        }
        .frame(height: 42)
        .animation(.easeOut(duration: 0.18), value: model.isImproving)
    }

    private var modelPicker: some View {
        Menu {
            Picker("Model", selection: $model.selectedModelId) {
                ForEach(model.availableModels) { option in
                    Text(option.displayName).tag(option.id)
                }
            }
            .pickerStyle(.inline)
            .labelsHidden()
        } label: {
            HStack(spacing: 6) {
                Image(systemName: "cpu")
                    .font(.system(size: 10))
                Text(selectedModelName)
                    .font(.system(size: 12, weight: .medium))
                    .lineLimit(1)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 8, weight: .semibold))
            }
            .foregroundStyle(Theme.textSecondary)
            .padding(.horizontal, 11)
            .padding(.vertical, 6)
            .background(RoundedRectangle(cornerRadius: 7).fill(Theme.surfaceRaised))
            .overlay(RoundedRectangle(cornerRadius: 7).strokeBorder(Theme.border, lineWidth: 1))
        }
        .menuStyle(.borderlessButton)
        .menuIndicator(.hidden)
        .fixedSize()
        .help("Model used by droid exec; saved as your default")
    }

    private var selectedModelName: String {
        model.availableModels.first(where: { $0.id == model.selectedModelId })?.displayName
            ?? "Default"
    }

    private func errorBanner(_ message: String) -> some View {
        HStack(alignment: .top, spacing: 8) {
            Image(systemName: "exclamationmark.triangle.fill")
                .font(.system(size: 12))
                .foregroundStyle(.orange)
            Text(message)
                .font(.system(size: 12))
                .foregroundStyle(Theme.textPrimary)
                .textSelection(.enabled)
            Spacer()
            Button {
                model.errorMessage = nil
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 10, weight: .semibold))
                    .foregroundStyle(Theme.textSecondary)
            }
            .buttonStyle(.plain)
        }
        .padding(10)
        .background(Color.orange.opacity(0.10))
        .clipShape(RoundedRectangle(cornerRadius: 9))
        .overlay(
            RoundedRectangle(cornerRadius: 9)
                .strokeBorder(Color.orange.opacity(0.25), lineWidth: 1)
        )
    }

    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionLabel(text: "Improved Prompt")
                Spacer()
                if !model.improvedPrompt.isEmpty {
                    Button {
                        model.copyImprovedPrompt()
                    } label: {
                        Label(model.didCopy ? "Copied" : "Copy",
                              systemImage: model.didCopy ? "checkmark" : "doc.on.doc")
                    }
                    .buttonStyle(GhostButtonStyle())
                    Button {
                        model.useImprovedAsDraft()
                    } label: {
                        Label("Use as Draft", systemImage: "arrow.uturn.up")
                    }
                    .buttonStyle(GhostButtonStyle())
                }
            }
            Group {
                if model.improvedPrompt.isEmpty {
                    resultEmptyState
                } else {
                    ScrollView {
                        Text(model.improvedPrompt)
                            .font(.system(size: 13, design: .monospaced))
                            .foregroundStyle(Theme.textPrimary)
                            .textSelection(.enabled)
                            .frame(maxWidth: .infinity, alignment: .topLeading)
                            .padding(14)
                    }
                }
            }
            .frame(minHeight: 190, maxHeight: .infinity)
            .surfaceStyle()
        }
    }

    private var resultEmptyState: some View {
        VStack(spacing: 10) {
            Image(systemName: "sparkles")
                .font(.system(size: 26))
                .foregroundStyle(Theme.textTertiary)
            Text("Your improved prompt will appear here")
                .font(.system(size: 12))
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
