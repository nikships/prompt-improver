import XCTest
@testable import PromptImprover
import Foundation

final class ModelCatalogTests: XCTestCase {

    // MARK: - load / builtin

    func testLoadIncludesSystemDefaultFirst() {
        let models = ModelCatalog.load()
        XCTAssertFalse(models.isEmpty)
        XCTAssertEqual(models.first?.id, "")
        XCTAssertEqual(models.first?.displayName, "Default")
    }

    func testBuiltinModelsCount() {
        XCTAssertEqual(ModelCatalog.builtinModels.count, 3)
    }

    func testBuiltinModelIds() {
        let ids = Set(ModelCatalog.builtinModels.map(\.id))
        XCTAssertTrue(ids.contains("claude-opus-5"))
        XCTAssertTrue(ids.contains("claude-sonnet-5"))
        XCTAssertTrue(ids.contains("gpt-5.3-codex"))
    }

    func testBuiltinDisplayNames() {
        let names = Set(ModelCatalog.builtinModels.map(\.displayName))
        XCTAssertTrue(names.contains("Claude Opus 5"))
        XCTAssertTrue(names.contains("Claude Sonnet 5"))
        XCTAssertTrue(names.contains("GPT-5.3 Codex"))
    }

    func testSystemDefaultSentinel() {
        XCTAssertEqual(ModelOption.systemDefault.id, "")
        XCTAssertEqual(ModelOption.systemDefault.displayName, "Default")
    }

    func testLoadCountIsBuiltinPlusOne() {
        // No custom file on a throwaway path; load() reads the real
        // home settings.json, so count is at least builtin+1.
        let models = ModelCatalog.load()
        XCTAssertGreaterThanOrEqual(models.count, ModelCatalog.builtinModels.count + 1)
    }

    func testLoadContainsAllBuiltins() {
        let models = ModelCatalog.load()
        for builtin in ModelCatalog.builtinModels {
            XCTAssertTrue(models.contains(builtin), "Missing builtin \(builtin.id)")
        }
    }

    func testModelOptionEquality() {
        let first = ModelOption(id: "x", displayName: "X")
        let second = ModelOption(id: "x", displayName: "X")
        XCTAssertEqual(first, second)
        XCTAssertEqual(first.hashValue, second.hashValue)
    }

    // MARK: - customModels(from:)

    func testCustomModelsFromMissingFileReturnsEmpty() {
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".json")
        XCTAssertEqual(ModelCatalog.customModels(from: url), [])
    }

    func testCustomModelsFromInvalidJsonReturnsEmpty() {
        let url = writeTempFile(contents: "not json {")
        XCTAssertEqual(ModelCatalog.customModels(from: url), [])
    }

    func testCustomModelsSkipsEntriesWithEmptyId() {
        let json = """
        {"customModels":[{"id":"","displayName":"Empty"},{"displayName":"NoId"}]}
        """
        let url = writeTempFile(contents: json)
        XCTAssertEqual(ModelCatalog.customModels(from: url), [])
    }

    func testCustomModelsUsesDisplayNameFallbackChain() {
        // displayName -> model -> id
        let json = """
        {
          "customModels": [
            {"id":"m1","displayName":"Pretty"},
            {"id":"m2","model":"ModelField"},
            {"id":"m3"}
          ]
        }
        """
        let url = writeTempFile(contents: json)
        let result = ModelCatalog.customModels(from: url)
        XCTAssertEqual(result.count, 3)
        XCTAssertEqual(result.first(where: { $0.id == "m1" })?.displayName, "Pretty")
        XCTAssertEqual(result.first(where: { $0.id == "m2" })?.displayName, "ModelField")
        XCTAssertEqual(result.first(where: { $0.id == "m3" })?.displayName, "m3")
    }

    func testCustomModelsEmptyDisplayNameFallsBack() {
        let json = """
        {"customModels":[{"id":"m1","displayName":"","model":"Fallback"}]}
        """
        let url = writeTempFile(contents: json)
        let result = ModelCatalog.customModels(from: url)
        XCTAssertEqual(result.first?.displayName, "Fallback")
    }

    func testCustomModelsSortedByDisplayName() {
        let json = """
        {
          "customModels": [
            {"id":"z","displayName":"Zebra"},
            {"id":"a","displayName":"Alpha"},
            {"id":"m","displayName":"Middle"}
          ]
        }
        """
        let url = writeTempFile(contents: json)
        let result = ModelCatalog.customModels(from: url)
        XCTAssertEqual(result.map(\.displayName), ["Alpha", "Middle", "Zebra"])
    }

    func testCustomModelsMissingKeyReturnsEmpty() {
        let json = #"{"otherKey": 1}"#
        let url = writeTempFile(contents: json)
        XCTAssertEqual(ModelCatalog.customModels(from: url), [])
    }

    // MARK: - helper

    private func writeTempFile(contents: String) -> URL {
        let tempURL = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString + ".json")
        do {
            try contents.write(to: tempURL, atomically: true, encoding: .utf8)
        } catch {
            XCTFail("Failed to write temp file: \(error)")
        }
        return tempURL
    }
}
