// ScoreDay-macOS - Main App Entry Point
import SwiftUI
import ScoreDayCore

@main
struct ScoreDayApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.dark)
        }
        .windowStyle(.hiddenTitleBar)
        .windowToolbarStyle(.unified)
        .defaultSize(width: 1200, height: 800)
        .windowResizability(.contentSize)
    }
}

@MainActor
final class AppState: ObservableObject {
    let apiClient: APIClient
    let dashboardService: DashboardService
    let taskService: TaskService
    let completionService: CompletionService
    let progressService: ProgressService

    init() {
        // Set in SettingsView via @AppStorage("apiBaseURL"); applied on next launch.
        let saved = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "http://localhost:3000"
        let url = URL(string: saved) ?? URL(string: "http://localhost:3000")!
        self.apiClient = APIClient(baseURL: url)
        self.dashboardService = DashboardService(client: apiClient)
        self.taskService = TaskService(client: apiClient)
        self.completionService = CompletionService(client: apiClient)
        self.progressService = ProgressService(client: apiClient)
    }
}