import SwiftUI

/// OLED-black design tokens.
enum Theme {
    static let background = Color.black
    static let surface = Color(red: 0.043, green: 0.043, blue: 0.047)      // #0B0B0C
    static let surfaceRaised = Color(red: 0.066, green: 0.066, blue: 0.075) // #111113
    static let border = Color.white.opacity(0.10)
    static let borderStrong = Color.white.opacity(0.16)
    static let textPrimary = Color(red: 0.96, green: 0.96, blue: 0.97)
    static let textSecondary = Color(red: 0.557, green: 0.557, blue: 0.576) // #8E8E93
    static let textTertiary = Color.white.opacity(0.28)
    static let accentStart = Color(red: 0.388, green: 0.4, blue: 0.945)     // #6366F1
    static let accentEnd = Color(red: 0.545, green: 0.361, blue: 0.965)     // #8B5CF6
    static let accentGradient = LinearGradient(
        colors: [accentStart, accentEnd],
        startPoint: .leading, endPoint: .trailing)

    static let corner: CGFloat = 12
}

/// Near-black card surface with a hairline border, used for editors and results.
struct SurfaceStyle: ViewModifier {
    var focused: Bool = false

    func body(content: Content) -> some View {
        content
            .background(Theme.surface)
            .clipShape(RoundedRectangle(cornerRadius: Theme.corner))
            .overlay(
                RoundedRectangle(cornerRadius: Theme.corner)
                    .strokeBorder(
                        focused ? Theme.accentStart.opacity(0.55) : Theme.border,
                        lineWidth: 1)
            )
            .animation(.easeOut(duration: 0.15), value: focused)
    }
}

extension View {
    func surfaceStyle(focused: Bool = false) -> some View {
        modifier(SurfaceStyle(focused: focused))
    }
}

/// Primary gradient action button (the Improve button).
struct GradientButtonStyle: ButtonStyle {
    @Environment(\.isEnabled) private var isEnabled

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(.white.opacity(isEnabled ? 1 : 0.45))
            .padding(.horizontal, 18)
            .padding(.vertical, 9)
            .background(
                RoundedRectangle(cornerRadius: 9)
                    .fill(Theme.accentGradient)
                    .opacity(isEnabled ? (configuration.isPressed ? 0.75 : 1) : 0.28)
            )
            .shadow(
                color: isEnabled ? Theme.accentStart.opacity(0.45) : .clear,
                radius: configuration.isPressed ? 6 : 14, y: 2)
            .scaleEffect(configuration.isPressed ? 0.98 : 1)
            .animation(.easeOut(duration: 0.12), value: configuration.isPressed)
    }
}

/// Quiet bordered button (Copy, Use as Draft, Choose, Cancel).
struct GhostButtonStyle: ButtonStyle {
    @State private var isHovering = false

    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.system(size: 12, weight: .medium))
            .foregroundStyle(isHovering ? Theme.textPrimary : Theme.textSecondary)
            .padding(.horizontal, 12)
            .padding(.vertical, 6)
            .background(
                RoundedRectangle(cornerRadius: 7)
                    .fill(isHovering ? Color.white.opacity(0.07) : Theme.surfaceRaised)
            )
            .overlay(
                RoundedRectangle(cornerRadius: 7)
                    .strokeBorder(isHovering ? Theme.borderStrong : Theme.border, lineWidth: 1)
            )
            .opacity(configuration.isPressed ? 0.7 : 1)
            .onHover { isHovering = $0 }
            .animation(.easeOut(duration: 0.12), value: isHovering)
    }
}

/// Small uppercase section label ("PROMPT", "IMPROVED PROMPT").
struct SectionLabel: View {
    let text: String

    var body: some View {
        Text(text.uppercased())
            .font(.system(size: 11, weight: .semibold))
            .tracking(1.2)
            .foregroundStyle(Theme.textSecondary)
    }
}
