# ADR-0009: Generate native Xcode projects with XcodeGen

## Status
Accepted.

## Context
The native macOS app shipped with a hand-written `project.pbxproj` (and a
`ScoreDayCore.xcodeproj`) that made `xcodebuild` segfault (exit 139), so the app
could not be built at all. `native/macOS/Package.swift` pointed at wrong source
paths and can't produce a proper `.app` bundle (Info.plist, ATS exception,
Keychain).

## Decision
- `native/macOS/project.yml` is the source of truth for the macOS app;
  `xcodegen generate` produces `ScoreDay-macOS.xcodeproj` and `Info.plist`.
- ScoreDayCore is consumed as a local Swift package (`packages:` in project.yml),
  not as a separate Xcode project; `native/ScoreDay.xcworkspace` references only
  the generated macOS project.
- The generated `.xcodeproj` and `Info.plist` are committed, so a fresh clone
  builds with plain `xcodebuild` without XcodeGen installed.
- Xcode build output goes to the default DerivedData, never inside the repo.

## Alternatives considered
- Hand-maintained `.pbxproj`: already broken; merge-hostile and unreviewable.
- SwiftPM executable only (`Package.swift`): no real app bundle or Info.plist.
- Tuist: more capable, but heavier than one small app needs.

## Consequences
- Changing targets, sources or settings means editing `project.yml` and
  re-running `xcodegen generate` (`brew install xcodegen`), then committing the
  regenerated files.
- `native/macOS/Package.swift` is now dead config (candidate for removal).
- The iOS app should get its own `project.yml` the same way.
- Build artifacts in-tree (`native/**/.build`, DerivedData) crashed the web
  toolchain; see ADR-0010's consequences for the fence.
