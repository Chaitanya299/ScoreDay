import SwiftUI

struct SettingsView: View {
    @AppStorage("apiBaseURL") private var apiBaseURL: String = "http://localhost:3000"
    @AppStorage("useSystemAppearance") private var useSystemAppearance = true
    @AppStorage("hapticFeedback") private var hapticFeedback = true

    var body: some View {
        NavigationStack {
            Form {
                Section("API Configuration") {
                    TextField("API Base URL", text: $apiBaseURL)
                        .textInputAutocapitalization(.never)
                        .autocorrectionDisabled()

                    Text("Current: \(apiBaseURL)")
                        .font(.caption)
                        .foregroundStyle(.secondary)

                    Button("Test Connection") {
                        testConnection()
                    }
                }

                Section("Appearance") {
                    Toggle("Use System Appearance", isOn: $useSystemAppearance)
                    Toggle("Haptic Feedback", isOn: $hapticFeedback)
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
                        // Reset UserDefaults
                        UserDefaults.standard.removeObject(forKey: "apiBaseURL")
                        UserDefaults.standard.removeObject(forKey: "useSystemAppearance")
                        UserDefaults.standard.removeObject(forKey: "hapticFeedback")
                    }
                }
            }
            .navigationTitle("Settings")
        }
    }

    private func testConnection() {
        // TODO: Implement connection test
    }
}

struct SettingsView_Previews: PreviewProvider {
    static var previews: some View {
        SettingsView()
    }
}