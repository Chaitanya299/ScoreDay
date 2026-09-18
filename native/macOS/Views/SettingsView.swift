import SwiftUI

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "http://localhost:3000"
    @AppStorage("useSystemAppearance") private var useSystemAppearance = true

    var body: some View {
        Form {
            Section("API Configuration") {
                TextField("API Base URL", text: $apiBaseURL)
                    .autocorrectionDisabled()
                    .frame(width: 400)

                Text("Current: \(apiBaseURL)")
                    .font(.caption)
                    .foregroundStyle(.secondary)

                Button("Test Connection") {
                    testConnection()
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

                Link("ScoreDay Web App", destination: URL(string: "https://github.com/scoreday")!)
                Link("Privacy Policy", destination: URL(string: "https://scoreday.app/privacy")!)
            }

            Section {
                Button("Reset All Data", role: .destructive) {
                    UserDefaults.standard.removeObject(forKey: "apiBaseURL")
                    UserDefaults.standard.removeObject(forKey: "useSystemAppearance")
                }
            }
        }
        .formStyle(.grouped)
        .frame(width: 500)
        .navigationTitle("Settings")
    }

    private func testConnection() {
        // TODO: Implement connection test
    }
}