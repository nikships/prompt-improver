// swift-tools-version: 5.10
import PackageDescription

let package = Package(
    name: "PromptImprover",
    platforms: [
        .macOS(.v14)
    ],
    targets: [
        .executableTarget(
            name: "PromptImprover",
            path: "Sources/PromptImprover"
        ),
        .testTarget(
            name: "PromptImproverTests",
            dependencies: ["PromptImprover"],
            path: "Tests/PromptImproverTests"
        )
    ]
)
