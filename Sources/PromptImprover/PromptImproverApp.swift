import SwiftUI

@main
struct PromptImproverApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) private var appDelegate

    var body: some Scene {
        WindowGroup("Prompt Improver") {
            ContentView()
                .frame(minWidth: 620, minHeight: 680)
                .preferredColorScheme(.dark)
        }
        // Title-bar hiding is done in AppDelegate.style(_:) instead of
        // .windowStyle(.hiddenTitleBar), which degrades the window's
        // accessibility role to an opaque dialog.
        .windowResizability(.contentMinSize)
    }
}

final class AppDelegate: NSObject, NSApplicationDelegate {
    // Ensures a Dock icon and key window when launched from a bare
    // executable (e.g. `swift run`) rather than a bundled .app.
    func applicationDidFinishLaunching(_ notification: Notification) {
        NSApp.setActivationPolicy(.regular)
        NSApp.appearance = NSAppearance(named: .darkAqua)
        NSApp.activate(ignoringOtherApps: true)
        for window in NSApp.windows {
            style(window)
        }
    }

    // OLED-black chrome: blend the title bar into the content so the whole
    // window reads as one seamless black surface.
    private func style(_ window: NSWindow) {
        window.titlebarAppearsTransparent = true
        window.titleVisibility = .hidden
        window.styleMask.insert(.fullSizeContentView)
        window.backgroundColor = NSColor.black
        window.isMovableByWindowBackground = true
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool {
        true
    }
}
