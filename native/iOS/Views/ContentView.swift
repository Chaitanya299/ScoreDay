// ScoreDay-iOS - Main Content View with Tab Navigation
import SwiftUI
import ScoreDayCore

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selection = 0

    var body: some View {
        TabView(selection: $selection) {
            TodayView(viewModel: TodayViewModel(
                dashboardService: appState.dashboardService,
                completionService: appState.completionService
            ))
                .tabItem {
                    Label("Today", systemImage: "sun.max.fill")
                }
                .tag(0)

            TasksView(viewModel: TasksViewModel(taskService: appState.taskService))
                .tabItem {
                    Label("Tasks", systemImage: "list.bullet.rectangle.fill")
                }
                .tag(1)

            ProgressView(viewModel: ProgressViewModel(progressService: appState.progressService))
                .tabItem {
                    Label("Progress", systemImage: "chart.line.uptrend.xyaxis")
                }
                .tag(2)

            SettingsView()
                .tabItem {
                    Label("Settings", systemImage: "gearshape.fill")
                }
                .tag(3)
        }
        .accentColor(.scoredayAccent)
    }
}