import Foundation
import ScoreDayCore

@MainActor
final class TodayViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var upcomingTasks: [Task] = []
    @Published var weeklyOverview: [WeeklyDay] = []
    @Published var earnedToday: Int = 0
    @Published var maxDaily: Int = 0
    @Published var dailyPercentage: Int = 0
    @Published var weeklyEarned: Int = 0
    @Published var weeklyMax: Int = 0
    @Published var weeklyPercentage: Int = 0
    @Published var completedCount: Int = 0
    @Published var incompleteCount: Int = 0
    @Published var streak: Int = 0
    @Published var loadingTaskId: String? = nil
    @Published var showError = false
    @Published var errorMessage: String? = nil

    private let dashboardService: DashboardService
    private let completionService: CompletionService

    init(dashboardService: DashboardService, completionService: CompletionService) {
        self.dashboardService = dashboardService
        self.completionService = completionService
    }

    func load() async {
        await refresh()
    }

    func refresh() async {
        do {
            let dashboard = try await dashboardService.fetchDashboard()
            await MainActor.run {
                self.tasks = dashboard.taskList
                self.upcomingTasks = dashboard.upcomingList
                self.weeklyOverview = dashboard.weeklyOverview
                self.earnedToday = dashboard.earnedToday
                self.maxDaily = dashboard.maxDaily
                self.dailyPercentage = dashboard.dailyPercentage
                self.weeklyEarned = dashboard.weeklyEarned
                self.weeklyMax = dashboard.weeklyMax
                self.weeklyPercentage = dashboard.weeklyPercentage
                self.completedCount = dashboard.completedCount
                self.incompleteCount = dashboard.incompleteCount
                self.streak = dashboard.streak
            }
        } catch {
            showError("Failed to load dashboard: \(error.localizedDescription)")
        }
    }

    func toggle(_ task: Task) async {
        loadingTaskId = task.id
        defer { loadingTaskId = nil }

        do {
            if task.statusForToday == .completed {
                _ = try await completionService.undo(taskId: task.id)
            } else {
                _ = try await completionService.complete(taskId: task.id)
            }
            await refresh()
        } catch {
            showError("Could not save. Please refresh and try again.")
        }
    }

    private func showError(_ message: String) {
        errorMessage = message
    }
}