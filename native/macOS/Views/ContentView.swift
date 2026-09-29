// ScoreDay-macOS - Main Content View with Sidebar Navigation
import SwiftUI
import ScoreDayCore

struct ContentView: View {
    @EnvironmentObject var appState: AppState
    @State private var selection: NavigationItem? = .today

    var body: some View {
        NavigationSplitView {
            SidebarView(selection: $selection)
        } detail: {
            DetailView(selection: selection)
        }
        .navigationTitle("")
    }
}

enum NavigationItem: String, CaseIterable, Identifiable {
    case today = "Today"
    case tasks = "Tasks"
    case progress = "Progress"
    case settings = "Settings"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .today: return "sun.max.fill"
        case .tasks: return "list.bullet.rectangle.fill"
        case .progress: return "chart.line.uptrend.xyaxis"
        case .settings: return "gearshape.fill"
        }
    }
}

struct SidebarView: View {
    @Binding var selection: NavigationItem?

    var body: some View {
        List(NavigationItem.allCases, selection: $selection) { item in
            NavigationLink(value: item) {
                Label(item.rawValue, systemImage: item.icon)
            }
        }
        .listStyle(.sidebar)
        .navigationTitle("ScoreDay")
        .frame(minWidth: 200, idealWidth: 220, maxWidth: 260)
    }
}

struct DetailView: View {
    let selection: NavigationItem?
    @EnvironmentObject var appState: AppState

    var body: some View {
        Group {
            switch selection {
            case .today:
                TodayView(viewModel: TodayViewModel(
                    dashboardService: appState.dashboardService,
                    completionService: appState.completionService
                ))
            case .tasks:
                TasksView(viewModel: TasksViewModel(taskService: appState.taskService))
            case .progress:
                ProgressScreen(viewModel: ProgressViewModel(progressService: appState.progressService))
            case .settings:
                SettingsView()
            case .none:
                EmptyView()
            }
        }
        .frame(minWidth: 600, minHeight: 500)
    }
}