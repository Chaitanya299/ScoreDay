// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScoreDayMacOS",
    platforms: [
        .macOS(.v14)
    ],
    products: [
        .executable(name: "ScoreDay", targets: ["ScoreDay"])
    ],
    dependencies: [
        .package(path: "../ScoreDayCore")
    ],
    targets: [
        .executableTarget(
            name: "ScoreDay",
            dependencies: ["ScoreDayCore"],
            path: ".",
            sources: [
                "ScoreDayApp.swift",
                "ContentView.swift",
                "TodayView.swift",
                "TasksView.swift",
                "ProgressView.swift",
                "SettingsView.swift",
                "StylesMac.swift",
                "ProgressComponents.swift",
                "ProgressComponents2.swift",
                "TaskFormViewMac.swift",
                "ViewModels/TodayViewModelMac.swift",
                "ViewModels/TasksViewModel.swift",
                "ViewModels/ProgressViewModelMac.swift",
                "TaskFormViewMac.swift",
                "StylesMac.swift"
            ],
            resources: []
        )
    ]
)
