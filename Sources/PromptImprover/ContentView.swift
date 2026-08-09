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
        .background(Theme.background.ignoresSafeArea())
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

    // Room for the traffic lights over the hidden title bar, with the
    // Factory logo centered as the window's brand header. A hairline rule
    // underneath separates the header band, as on factory.ai's nav.
    private var titleBarSpacer: some View {
        VStack(spacing: 0) {
            HStack {
                Spacer()
                LogoView(height: 15)
                    .opacity(0.9)
                Spacer()
            }
            .frame(height: 30)
            .padding(.top, 6)
            Rectangle()
                .fill(Theme.border)
                .frame(height: 1)
                .padding(.horizontal, -20)
                .padding(.top, 8)
        }
    }

    private var dropOverlay: some View {
        RoundedRectangle(cornerRadius: Theme.corner)
            .strokeBorder(Theme.accent, lineWidth: 1.5)
            .background(Theme.accent.opacity(0.05))
            .overlay {
                Label("Drop folder to select repository", systemImage: "folder.badge.plus")
                    .font(Theme.mono(13, weight: .medium))
                    .textCase(.uppercase)
                    .tracking(0.8)
                    .foregroundStyle(Theme.textPrimary)
                    .padding(14)
                    .background(Theme.surfaceRaised, in: RoundedRectangle(cornerRadius: Theme.corner))
                    .overlay(
                        RoundedRectangle(cornerRadius: Theme.corner)
                            .strokeBorder(Theme.borderStrong, lineWidth: 1)
                    )
            }
            .padding(6)
            .allowsHitTesting(false)
    }

    private var repositoryRow: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(index: "01", text: "Repository")
            HStack(spacing: 10) {
                HStack(spacing: 8) {
                    Image(systemName: "folder.fill")
                        .font(.system(size: 11))
                        .foregroundStyle(
                            model.repositoryURL != nil
                                ? Theme.accent
                                : Theme.textTertiary)
                    if let repo = model.repositoryURL {
                        Text(repo.path)
                            .font(Theme.mono(12))
                            .foregroundStyle(Theme.textPrimary.opacity(0.8))
                            .lineLimit(1)
                            .truncationMode(.middle)
                            .help(repo.path)
                    } else {
                        Text("No repository selected")
                            .font(Theme.mono(12))
                            .foregroundStyle(Theme.textSecondary)
                    }
                    Spacer(minLength: 0)
                }
                .padding(.horizontal, 12)
                .padding(.vertical, 8)
                .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Theme.surface))
                .overlay(RoundedRectangle(cornerRadius: Theme.corner).strokeBorder(Theme.border, lineWidth: 1))

                Button("Choose") {
                    model.chooseRepository()
                }
                .buttonStyle(GhostButtonStyle())
            }
            Text("or drag & drop a folder anywhere in this window")
                .font(Theme.mono(10))
                .foregroundStyle(Theme.textTertiary)
                .padding(.leading, 1)
        }
    }

    private var promptSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            SectionLabel(index: "02", text: "Prompt")
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
                        .tint(Theme.accent)
                    Text("SCANNING REPOSITORY")
                        .font(Theme.mono(11, weight: .medium))
                        .tracking(0.8)
                        .foregroundStyle(Theme.textPrimary.opacity(0.75))
                    Text("\(model.elapsedSeconds)s")
                        .font(Theme.mono(11))
                        .foregroundStyle(Theme.accent)
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
                        HStack(spacing: 8) {
                            Text("Improve")
                            Image(systemName: "arrow.right")
                                .font(.system(size: 10, weight: .semibold))
                        }
                    }
                    .buttonStyle(PrimaryButtonStyle())
                    .keyboardShortcut(.return, modifiers: .command)
                    .disabled(!model.canImprove)
                    Text("⌘↩")
                        .font(Theme.mono(10))
                        .foregroundStyle(Theme.textTertiary)
                    Text("Uses your repository for context")
                        .font(Theme.mono(10))
                        .foregroundStyle(Theme.textTertiary)
                        .padding(.leading, 4)
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
                Text(selectedModelName.uppercased())
                    .font(Theme.mono(11))
                    .tracking(0.5)
                    .lineLimit(1)
                Image(systemName: "chevron.up.chevron.down")
                    .font(.system(size: 8, weight: .semibold))
            }
            .foregroundStyle(Theme.textSecondary)
            .padding(.horizontal, 11)
            .padding(.vertical, 7)
            .background(RoundedRectangle(cornerRadius: Theme.corner).fill(Theme.surfaceRaised))
            .overlay(RoundedRectangle(cornerRadius: Theme.corner).strokeBorder(Theme.borderStrong, lineWidth: 1))
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
            Text("ERR")
                .font(Theme.mono(10, weight: .semibold))
                .tracking(1)
                .foregroundStyle(Theme.danger)
                .padding(.top, 1)
            Text(message)
                .font(Theme.mono(11))
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
        .background(Theme.danger.opacity(0.08))
        .clipShape(RoundedRectangle(cornerRadius: Theme.corner))
        .overlay(
            RoundedRectangle(cornerRadius: Theme.corner)
                .strokeBorder(Theme.danger.opacity(0.35), lineWidth: 1)
        )
    }

    private var resultSection: some View {
        VStack(alignment: .leading, spacing: 8) {
            HStack {
                SectionLabel(index: "03", text: "Improved Prompt")
                Spacer()
                if !model.improvedPrompt.isEmpty {
                    Button(model.didCopy ? "Copied" : "Copy") {
                        model.copyImprovedPrompt()
                    }
                    .buttonStyle(GhostButtonStyle())
                    Button("Use as Draft") {
                        model.useImprovedAsDraft()
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
        VStack(spacing: 12) {
            DroidGlyph(size: 30)
                .foregroundStyle(Theme.textTertiary)
            Text("YOUR IMPROVED PROMPT WILL APPEAR HERE")
                .font(Theme.mono(10))
                .tracking(1.2)
                .foregroundStyle(Theme.textTertiary)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
