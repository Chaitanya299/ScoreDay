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
        // Set in SettingsView (URL in UserDefaults, token in Keychain); applied on next launch.
        let saved = UserDefaults.standard.string(forKey: "apiBaseURL") ?? "http://localhost:3000"
        let url = URL(string: saved) ?? URL(string: "http://localhost:3000")!
        self.apiClient = APIClient(baseURL: url, token: TokenStore.get())
        self.dashboardService = DashboardService(client: apiClient)
        self.taskService = TaskService(client: apiClient)
        self.completionService = CompletionService(client: apiClient)
        self.progressService = ProgressService(client: apiClient)
    }
}

/// API token lives in the Keychain (it grants full read/write to your data), not UserDefaults.
enum TokenStore {
    private static let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "app.scoreday.macos",
        kSecAttrAccount as String: "apiToken",
    ]

    static func get() -> String? {
        var q = query
        q[kSecReturnData as String] = true
        q[kSecMatchLimit as String] = kSecMatchLimitOne
        var item: CFTypeRef?
        guard SecItemCopyMatching(q as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    static func set(_ token: String) {
        SecItemDelete(query as CFDictionary)
        guard !token.isEmpty else { return }  // empty = remove
        var q = query
        q[kSecValueData as String] = Data(token.utf8)
        SecItemAdd(q as CFDictionary, nil)
    }
}

/// User-facing message for a failed load: auth problems are not connection problems.
func loadErrorMessage(_ error: Error) -> String {
    if case APIError.unauthorized = error {
        return "The server rejected the API token. Set the correct token in Settings, then relaunch."
    }
    return "Can't reach the ScoreDay server. Your tasks are safe — this is a connection problem, not data loss."
}
