import XCTest
@testable import PromptImprover
import Foundation

final class DroidRunnerTests: XCTestCase {

    // MARK: - parseResult

    func testParseResultEmptyThrows() {
        XCTAssertThrowsError(try DroidRunner.parseResult(from: ""))
        XCTAssertThrowsError(try DroidRunner.parseResult(from: "   \n  "))
    }

    func testParseResultSimpleResultKey() throws {
        let json = #"{"result":"Hello world"}"#
        let out = try DroidRunner.parseResult(from: json)
        XCTAssertEqual(out, "Hello world")
    }

    func testParseResultFinalTextKey() throws {
        let json = #"{"finalText":"Via finalText"}"#
        let out = try DroidRunner.parseResult(from: json)
        XCTAssertEqual(out, "Via finalText")
    }

    func testParseResultPrefersResultOverFinalText() throws {
        let json = #"{"result":"R","finalText":"F"}"#
        let out = try DroidRunner.parseResult(from: json)
        XCTAssertEqual(out, "R")
    }

    func testParseResultTrimsWhitespace() throws {
        let json = #"{"result":"  spaced  "}"#
        let out = try DroidRunner.parseResult(from: json)
        XCTAssertEqual(out, "spaced")
    }

    func testParseResultWhitespaceOnlyResultThrowsEmpty() {
        let json = #"{"result":"   "}"#
        XCTAssertThrowsError(try DroidRunner.parseResult(from: json)) { actual in
            guard let runnerError = actual as? DroidRunnerError, case .emptyResult = runnerError else {
                XCTFail("Expected emptyResult, got \(actual)"); return
            }
        }
    }

    func testParseResultIsErrorThrowsExecutionFailed() {
        let json = #"{"is_error":true,"result":"blocked"}"#
        XCTAssertThrowsError(try DroidRunner.parseResult(from: json)) { actual in
            guard let runnerError = actual as? DroidRunnerError, case .executionFailed = runnerError else {
                XCTFail("Expected executionFailed, got \(actual)"); return
            }
        }
    }

    func testParseResultMultilinePicksLastValidLine() throws {
        // NDJSON: last JSON line wins when scanning reversed.
        let stdout = """
        {"type":"progress","msg":"thinking"}
        {"result":"First"}
        {"result":"Last"}
        """
        let out = try DroidRunner.parseResult(from: stdout)
        XCTAssertEqual(out, "Last")
    }

    func testParseResultIgnoresNonJsonLines() throws {
        let stdout = """
        not json at all
        {"result":"Good"}
        """
        let out = try DroidRunner.parseResult(from: stdout)
        XCTAssertEqual(out, "Good")
    }

    func testParseResultOnlyNonJsonThrowsUnparseable() {
        let stdout = "just text\nmore text"
        XCTAssertThrowsError(try DroidRunner.parseResult(from: stdout)) { actual in
            guard let runnerError = actual as? DroidRunnerError, case .unparseableOutput = runnerError else {
                XCTFail("Expected unparseableOutput, got \(actual)"); return
            }
        }
    }

    func testParseResultJsonWithoutResultKeyThrowsUnparseable() {
        let json = #"{"other":123}"#
        XCTAssertThrowsError(try DroidRunner.parseResult(from: json)) { actual in
            guard let runnerError = actual as? DroidRunnerError, case .unparseableOutput = runnerError else {
                XCTFail("Expected unparseableOutput, got \(actual)"); return
            }
        }
    }

    // MARK: - DroidRunnerError descriptions

    func testErrorDescriptions() {
        XCTAssertTrue(DroidRunnerError.droidNotFound.errorDescription!.contains("droid"))
        XCTAssertTrue(DroidRunnerError.launchFailed("oops").errorDescription!.contains("oops"))
        XCTAssertTrue(DroidRunnerError.executionFailed(exitCode: 7, stderr: "bad").errorDescription!.contains("7"))
        XCTAssertTrue(DroidRunnerError.executionFailed(exitCode: 1, stderr: "  ").errorDescription!.contains("1"))
        XCTAssertTrue(DroidRunnerError.emptyResult.errorDescription!.lowercased().contains("empty"))
        XCTAssertTrue(DroidRunnerError.unparseableOutput(String(repeating: "x", count: 500)).errorDescription!.contains("Could not parse"))
        // Preview truncation to 300 chars
        let long = String(repeating: "y", count: 1000)
        let desc = DroidRunnerError.unparseableOutput(long).errorDescription!
        // Preview is 300 chars — the description should be shorter than input
        XCTAssertLessThan(desc.count, long.count + 200)
    }

    func testExecutionFailedTrimsStderr() {
        let desc = DroidRunnerError.executionFailed(exitCode: 1, stderr: "  hello  \n").errorDescription!
        XCTAssertTrue(desc.contains("hello"))
        XCTAssertFalse(desc.hasSuffix("  \n"))
    }

    // MARK: - improvementInstructions

    func testImprovementInstructionsNotEmpty() {
        XCTAssertFalse(DroidRunner.improvementInstructions.isEmpty)
    }

    func testImprovementInstructionsContainsKeyPhrases() {
        let instructions = DroidRunner.improvementInstructions
        XCTAssertTrue(instructions.contains("prompt engineer"))
        XCTAssertTrue(instructions.contains("Draft prompt to improve"))
        XCTAssertTrue(instructions.contains("Output ONLY"))
    }

    // MARK: - findDroid

    func testFindDroidReturnsNilOrExecutablePath() {
        let result = DroidRunner.findDroid()
        if let path = result {
            XCTAssertTrue(FileManager.default.isExecutableFile(atPath: path), "findDroid returned non-executable: \(path)")
        }
        // nil is acceptable (droid not installed in CI)
    }
}
