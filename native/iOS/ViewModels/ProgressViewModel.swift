import Foundation
import ScoreDayCore

@MainActor
final class ProgressViewModel: ObservableObject {
    @Published var viewMode: ViewMode = .month
    @Published var currentMonth: Month = Month.current()
    @Published var currentWeekStart: LocalDate = LocalDate.today().startOfWeek()
    @Published var monthlyProgress: MonthlyProgress?
    @Published var weeklyProgress: WeeklyProgress?
    @Published var dayDetail: DayDetail?
    @Published var showDayDetail = false
    @Published var selectedDay: LocalDate? = nil
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String? = nil

    private let progressService: ProgressService

    init(progressService: ProgressService) {
        self.progressService = progressService
    }

    func load() async {
        await refresh()
    }

    func refresh() async {
        isLoading = true
        defer { isLoading = false }

        do {
            if viewMode == .month {
                let progress = try await progressService.monthly(month: currentMonth)
                await MainActor.run { self.monthlyProgress = progress }
            } else {
                let progress = try await progressService.weekly(weekStart: currentWeekStart)
                await MainActor.run { self.weeklyProgress = progress }
            }
        } catch {
            showError("Failed to load progress: \(error.localizedDescription)")
        }
    }

    func previousPeriod() {
        if viewMode == .month {
            currentMonth = currentMonth.previous()
        } else {
            currentWeekStart = currentWeekStart.adding(days: -7)!
        }
    }

    func nextPeriod() {
        if viewMode == .month {
            currentMonth = currentMonth.next()
        } else {
            currentWeekStart = currentWeekStart.adding(days: 7)!
        }
    }

    func selectDay(_ date: LocalDate) {
        selectedDay = date
        Task {
            await loadDayDetail(date)
        }
    }

    private func loadDayDetail(_ date: LocalDate) async {
        do {
            let detail = try await progressService.dayDetail(date: date)
            await MainActor.run {
                self.dayDetail = detail
                self.selectedDay = date
                self.showDayDetail = true
            }
        } catch {
            showError("Failed to load day detail: \(error.localizedDescription)")
        }
    }

    func changeViewMode(_ mode: ViewMode) {
        if viewMode != mode {
            viewMode = mode
        }
    }

    private func showError(_ message: String) {
        errorMessage = message
    }
}

enum ViewMode: CaseIterable {
    case week, month

    var displayName: String {
        switch self {
        case .week: return "Week"
        case .month: return "Month"
        }
    }
}