import XCTest
@testable import PromptImprover
import SwiftUI

final class ThemeTests: XCTestCase {

    func testCornerRadius() {
        XCTAssertEqual(Theme.corner, 3)
    }

    func testMonoReturnsNonNil() {
        // Font construction should not crash; check via description
        let regular = Theme.mono(12)
        XCTAssertNotNil(regular)
        let bold = Theme.mono(14, weight: .bold)
        XCTAssertNotNil(bold)
    }

    func testColorsAreDefined() {
        // Just ensure these don't crash and are distinct-ish
        _ = Theme.background
        _ = Theme.surface
        _ = Theme.surfaceRaised
        _ = Theme.border
        _ = Theme.borderStrong
        _ = Theme.textPrimary
        _ = Theme.textSecondary
        _ = Theme.textTertiary
        _ = Theme.accent
        _ = Theme.accentBright
        _ = Theme.danger
    }

    func testAccentDiffersFromBackground() {
        // Accent and background should be different colors
        XCTAssertNotEqual(Theme.accent, Theme.background)
    }

    func testSurfaceDiffersFromBackground() {
        XCTAssertNotEqual(Theme.surface, Theme.background)
    }
}
