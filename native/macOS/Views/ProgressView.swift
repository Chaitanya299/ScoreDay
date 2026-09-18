// ScoreDay-macOS - Progress View with Weekly/Monthly Analytics
import SwiftUI
import Charts
import ScoreDayCore

struct ProgressScreen: View {
    @StateObject var viewModel: ProgressViewModel

    init(viewModel: ProgressViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 20) {
                // Period Selector
                PeriodSelectorViewMac(viewModel: viewModel)

                // Summary Cards (Month view only)
                if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                    SummaryCardsViewMac(progress: progress.monthlyProgress)
                }

                // Chart (Month view only)
                if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                    ScoreChartViewMac(dailyScores: progress.monthlyProgress.dailyScores)
                }

                // Activity Calendar (Month view only)
                if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                    ActivityCalendarViewMac(month: viewModel.currentMonth, dailyScores: progress.monthlyProgress.dailyScores)
                }

                // Weekly Progress (Week view)
                if viewModel.viewMode == .week, let progress = viewModel.weeklyProgress {
                    WeeklyProgressViewMac(progress: progress.weeklyProgress)
                }

                // Consistency
                if let progress = viewModel.monthlyProgress {
                    ConsistencyViewMac(streak: progress.streaks)
                }

                // Task Performance
                if let progress = viewModel.monthlyProgress {
                    TaskPerformanceViewMac(items: progress.taskPerformance)
                }

                // Category Performance
                if let progress = viewModel.monthlyProgress {
                    CategoryPerformanceViewMac(items: progress.categoryPerformance)
                }

                // Missed
                if let progress = viewModel.monthlyProgress {
                    MissedViewMac(items: progress.missed)
                }

                // Trend (Month view only)
                if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                    TrendViewMac(trend: progress.trend)
                }
            }
            .padding(24)
        }
        .background(Color(hex: 0x0B0E14))
        .navigationTitle("Progress")
        .toolbar {
            ToolbarItem(placement: .navigation) {
                Button(action: { }) {
                    Image(systemName: "sidebar.left")
                }
            }
        }
        .refreshable {
            await viewModel.refresh()
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK") { }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .sheet(isPresented: $viewModel.showDayDetail) {
            if let detail = viewModel.dayDetail {
                DayDetailSheetMac(detail: detail)
            }
        }
        .task {
            await viewModel.refresh()
        }
        .onChange(of: viewModel.viewMode) { _, _ in
            _Concurrency.Task { await viewModel.refresh() }
        }
        .onChange(of: viewModel.currentMonth) { _, _ in
            if viewModel.viewMode == .month {
                _Concurrency.Task { await viewModel.refresh() }
            }
        }
        .onChange(of: viewModel.currentWeekStart) { _, _ in
            if viewModel.viewMode == .week {
                _Concurrency.Task { await viewModel.refresh() }
            }
        }
    }
}

struct PeriodSelectorViewMac: View {
    @ObservedObject var viewModel: ProgressViewModel

    var body: some View {
        HStack {
            Picker("", selection: $viewModel.viewMode) {
                ForEach(ViewMode.allCases, id: \.self) { Text($0.displayName).tag($0) }
            }
            .pickerStyle(.segmented)
            .frame(width: 180)

            Spacer()

            Button { viewModel.previousPeriod() } label: { Image(systemName: "chevron.left") }
            Text(viewModel.viewMode == .month ? viewModel.currentMonth.isoString : "Week of \(viewModel.currentWeekStart.isoString)")
                .font(.headline)
                .frame(minWidth: 160)
            Button { viewModel.nextPeriod() } label: { Image(systemName: "chevron.right") }
        }
    }
}

struct SummaryCardsViewMac: View {
    let progress: MonthlyProgress

    var body: some View {
        HStack(spacing: 16) {
            ConsistencyStatMac(label: "Average", value: "\(progress.averageScore)", unit: "%", color: .scoredayAccentDev)
            ConsistencyStatMac(label: "Points", value: "\(progress.totalPoints)", color: .scoredaySuccessDev)
            ConsistencyStatMac(label: "Completion", value: "\(progress.completionRate)", unit: "%", color: .scoredayWarningDev)
            ConsistencyStatMac(label: "Best day", value: progress.bestDay.map { "\($0.percentage)" } ?? "–", unit: progress.bestDay == nil ? "" : "%", color: .scoredayAccentDev)
        }
    }
}

struct ProgressScreen_Previews: PreviewProvider {
    static var previews: some View {
        let appState = AppState()
        ProgressScreen(viewModel: ProgressViewModel(progressService: appState.progressService))
            .environmentObject(appState)
    }
}