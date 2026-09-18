// ScoreDay-iOS - Today View with Check/Uncheck functionality
import SwiftUI
import ScoreDayCore

struct TodayView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel: TodayViewModel

    init(viewModel: TodayViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 24) {
                    // Today's Score Card
                    ScoreCard(
                        earned: viewModel.earnedToday,
                        max: viewModel.maxDaily,
                        percentage: viewModel.dailyPercentage,
                        completedCount: viewModel.completedCount,
                        incompleteCount: viewModel.incompleteCount,
                        streak: viewModel.streak
                    )

                    // Today's Tasks
                    TasksSection(viewModel: viewModel)

                    // Coming Up
                    if !viewModel.upcomingTasks.isEmpty {
                        ComingUpSection(tasks: viewModel.upcomingTasks)
                    }

                    // Weekly Summary
                    WeeklySummarySection(viewModel: viewModel)
                }
                .padding(.horizontal, 16)
                .padding(.vertical, 12)
            }
            .background(Color.scoredayBackground)
            .navigationTitle("ScoreDay")
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
            .task {
                await viewModel.load()
            }
        }
    }
}

// MARK: - Preview Provider
struct TodayView_Previews: PreviewProvider {
    static var previews: some View {
        let appState = AppState()
        TodayView(viewModel: TodayViewModel(
            dashboardService: appState.dashboardService,
            completionService: appState.completionService
        ))
        .environmentObject(appState)
    }
}