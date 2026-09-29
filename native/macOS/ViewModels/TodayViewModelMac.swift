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
    @Published var loadFailed = false
    /// The day being viewed. Defaults to today; past days can be reviewed and back-filled.
    @Published var selectedDate: LocalDate = .today()

    var isToday: Bool { selectedDate == .today() }

    private let dashboardService: DashboardService
    private let completionService: CompletionService

    init(dashboardService: DashboardService, completionService: CompletionService) {
        self.dashboardService = dashboardService
        self.completionService = completionService
    }

    func load() async {
        await refresh()
    }

    func goToPreviousDay() {
        selectedDate = selectedDate.adding(days: -1) ?? selectedDate
    }

    func goToNextDay() {
        guard !isToday, let next = selectedDate.adding(days: 1) else { return }  // never go past today
        selectedDate = next
    }

    func goToToday() {
        selectedDate = .today()
    }

    func refresh() async {
        do {
            let dashboard = try await dashboardService.fetchDashboard(date: isToday ? nil : selectedDate)
            await MainActor.run {
                self.loadFailed = false
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
            loadFailed = true
            showError(loadErrorMessage(error))
        }
    }

    func toggle(_ task: Task) async {
        loadingTaskId = task.id
        defer { loadingTaskId = nil }

        do {
            let completed = task.statusForToday == .completed || task.statusForToday == .satisfied
            if completed {
                _ = try await completionService.undo(taskId: task.id, date: selectedDate)
            } else {
                _ = try await completionService.complete(taskId: task.id, date: selectedDate)
            }
            await refresh()
        } catch {
            showError("Could not save. Please refresh and try again.")
        }
    }

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
}
