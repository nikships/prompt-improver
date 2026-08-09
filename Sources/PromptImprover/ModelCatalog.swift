import Foundation

struct ModelOption: Identifiable, Hashable {
    let id: String
    let displayName: String

    /// Sentinel for "let droid use its default model" (no -m flag).
    static let systemDefault = ModelOption(id: "", displayName: "Default")
}

/// Discovers selectable models from the droid CLI configuration.
enum ModelCatalog {

    // Factory built-in models available to every install; custom models from
    // settings.json are appended after these.
    private static let builtinModels: [ModelOption] = [
        ModelOption(id: "claude-opus-5", displayName: "Claude Opus 5"),
        ModelOption(id: "claude-sonnet-5", displayName: "Claude Sonnet 5"),
        ModelOption(id: "gpt-5.3-codex", displayName: "GPT-5.3 Codex"),
    ]

    static func load() -> [ModelOption] {
        var options = [ModelOption.systemDefault]
        options.append(contentsOf: builtinModels)
        options.append(contentsOf: customModels())
        return options
    }

    private static func customModels() -> [ModelOption] {
        let settingsURL = FileManager.default.homeDirectoryForCurrentUser
            .appendingPathComponent(".factory/settings.json")
        guard let data = try? Data(contentsOf: settingsURL),
              let root = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let custom = root["customModels"] as? [[String: Any]]
        else { return [] }

        return custom.compactMap { entry in
            guard let id = entry["id"] as? String, !id.isEmpty else { return nil }
            let name = (entry["displayName"] as? String).flatMap { $0.isEmpty ? nil : $0 }
                ?? (entry["model"] as? String)
                ?? id
            return ModelOption(id: id, displayName: name)
        }
        .sorted { $0.displayName.localizedCaseInsensitiveCompare($1.displayName) == .orderedAscending }
    }
}
