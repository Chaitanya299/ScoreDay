// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "ScoreDayCore",
    platforms: [
        .iOS(.v17),
        .macOS(.v14)
    ],
    products: [
        .library(name: "ScoreDayCore", targets: ["ScoreDayCore"])
    ],
    dependencies: [
        .package(url: "https://github.com/groue/GRDB.swift", from: "6.0.0")
    ],
    targets: [
        .target(
            name: "ScoreDayCore",
            dependencies: [
                .product(name: "GRDB", package: "GRDB.swift")
            ],
            path: "Sources"
        ),
        .testTarget(
            name: "ScoreDayCoreTests",
            dependencies: ["ScoreDayCore"],
            path: "Tests"
        )
    ]
)