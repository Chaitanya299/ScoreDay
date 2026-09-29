import SwiftUI
import ScoreDayCore

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "http://localhost:3000"
    @AppStorage("useSystemAppearance") private var useSystemAppearance = true
    @State private var apiToken: String = TokenStore.get() ?? ""
    @State private var testResult: String? = nil
    @State private var testing = false

    var body: some View {
        Form {
            Section("Server") {
                TextField("API Base URL", text: $apiBaseURL)
                    .autocorrectionDisabled()
                    .frame(width: 400)

                SecureField("API Token", text: $apiToken)
                    .frame(width: 400)
                    .onSubmit { TokenStore.set(apiToken) }
                    .onChange(of: apiToken) { _, new in TokenStore.set(new) }

                Text("Use your Railway URL (https://…) and the same API_TOKEN you set on the server. Leave the token empty for a local dev server. Relaunch to apply.")
                    .font(.caption)
                    .foregroundStyle(.secondary)
                    .frame(width: 400, alignment: .leading)

                HStack {
                    Button(testing ? "Testing…" : "Test Connection") {
                        _Concurrency.Task { await testConnection() }
                    }
                    .disabled(testing)

                    if let testResult {
                        Text(testResult)
                            .font(.caption)
                            .foregroundStyle(testResult.hasPrefix("✓") ? Color(hex: 0x10B981) : Color(hex: 0xEF4444))
                    }
                }
            }

            Section("Appearance") {
                Toggle("Use System Appearance", isOn: $useSystemAppearance)
            }

            Section("About") {
                HStack {
                    Text("Version")
                    Spacer()
                    Text("1.0.0")
                        .foregroundStyle(.secondary)
                }
            }

            Section {
                Button("Reset Settings", role: .destructive) {
                    UserDefaults.standard.removeObject(forKey: "apiBaseURL")
                    UserDefaults.standard.removeObject(forKey: "useSystemAppearance")
                    TokenStore.set("")
                    apiToken = ""
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 500)
        .navigationTitle("Settings")
    }

    /// Checks the URL + token as entered (not the running session's), so a new
    /// server can be verified before relaunching.
    private func testConnection() async {
        testing = true
        defer { testing = false }
        guard let url = URL(string: apiBaseURL) else {
            testResult = "✗ Invalid URL"
            return
        }
        do {
            let client = APIClient(baseURL: url, token: apiToken)
            let tasks = try await TaskService(client: client).list()
            testResult = "✓ Connected — \(tasks.count) tasks. Relaunch to use this server."
        } catch APIError.unauthorized {
            testResult = "✗ Reached server, but the token was rejected"
        } catch {
            testResult = "✗ \(error.localizedDescription)"
        }
    }
}
