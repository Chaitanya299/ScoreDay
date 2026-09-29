// ScoreDay-iOS - Progress View with Weekly/Monthly Analytics
import SwiftUI
import Charts
import ScoreDayCore

struct ProgressView: View {
    @StateObject var viewModel: ProgressViewModel

    init(viewModel: ProgressViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Period Selector
                    PeriodSelectorView(viewModel: viewModel)

                    // Summary Cards (Month view only)
                    if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                        SummaryCardsView(progress: progress)
                    }

                    // Chart (Month view only)
                    if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                        ScoreChartView(dailyScores: progress.dailyScores)
                    }

                    // Activity Calendar (Month view only)
                    if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                        ActivityCalendarView(month: viewModel.currentMonth, dailyScores: progress.dailyScores)
                            .onTapGesture { date in
                                if let date = date {
                                    viewModel.selectDay(date)
                                }
                            }
                    }

                    // Weekly Progress (Week view)
                    if viewModel.viewMode == .week, let progress = viewModel.weeklyProgress {
                        WeeklyProgressView(progress: progress)
                    }

                    // Consistency
                    if let progress = viewModel.monthlyProgress {
                        ConsistencyView(streak: progress.streak)
                    }

                    // Task Performance
                    if let progress = viewModel.monthlyProgress {
                        TaskPerformanceView(items: progress.taskPerformance)
                    }

                    // Category Performance
                    if let progress = viewModel.monthlyProgress {
                        CategoryPerformanceView(items: progress.categoryPerformance)
                    }

                    // Missed
                    if let progress = viewModel.monthlyProgress {
                        MissedView(items: progress.missed)
                    }

                    // Trend (Month view only)
                    if viewModel.viewMode == .month, let progress = viewModel.monthlyProgress {
                        TrendView(trend: progress.trend)
                    }
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(Color.scoredayBackground)
            .navigationTitle("Progress")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
                            .foregroundStyle(.scoredayTextSecondary)
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
                    DayDetailSheet(detail: detail)
                }
            }
            .task {
                await viewModel.refresh()
            }
            .onChange(of: viewModel.viewMode) { _, _ in
                Task { await viewModel.refresh() }
            }
            .onChange(of: viewModel.currentMonth) { _, _ in
                if viewModel.viewMode == .month {
                    Task { await viewModel.refresh() }
                }
            }
            .onChange(of: viewModel.currentWeekStart) { _, _ in
                if viewModel.viewMode == .week {
                    Task { await viewModel.refresh() }
                }
            }
        }
    }
}

struct ProgressView_Previews: PreviewProvider {
    static var previews: some View {
        let appState = AppState()
        ProgressView(viewModel: ProgressViewModel(progressService: appState.progressService))
            .environmentObject(appState)
    }
}