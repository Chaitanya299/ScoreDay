// ScoreDay-iOS - Main App Entry Point
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
    }
}

@MainActor
final class AppState: ObservableObject {
    @Published var apiBaseURL: String = {
        #if DEBUG
        return "http://localhost:3000"
        #else
        return "https://api.scoreday.app"
        #endif
    }()

    let apiClient: APIClient
    let dashboardService: DashboardService
    let taskService: TaskService
    let completionService: CompletionService
    let progressService: ProgressService

    init() {
        let url = URL(string: apiBaseURL) ?? URL(string: "http://localhost:3000")!
        self.apiClient = APIClient(baseURL: url)
        self.dashboardService = DashboardService(client: apiClient)
        self.taskService = TaskService(client: apiClient)
        self.completionService = CompletionService(client: apiClient)
        self.progressService = ProgressService(client: apiClient)
    }
}