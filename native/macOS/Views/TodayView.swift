// ScoreDay-macOS - Today View
import SwiftUI
import ScoreDayCore

struct TodayView: View {
    @EnvironmentObject var appState: AppState
    @StateObject private var viewModel: TodayViewModel

    init(viewModel: TodayViewModel) {
        _viewModel = StateObject(wrappedValue: viewModel)
    }

    @ViewBuilder
    private var loadedContent: some View {
        ScoreCard(
            earned: viewModel.earnedToday,
            max: viewModel.maxDaily,
            percentage: viewModel.dailyPercentage,
            completedCount: viewModel.completedCount,
            incompleteCount: viewModel.incompleteCount,
            streak: viewModel.streak
        )

        HStack(alignment: .top, spacing: 24) {
            TasksSection(viewModel: viewModel)
                .frame(maxWidth: .infinity)

            VStack(spacing: 24) {
                WeeklySummarySection(viewModel: viewModel)

                if !viewModel.upcomingTasks.isEmpty {
                    ComingUpSection(tasks: viewModel.upcomingTasks)
                }
            }
            .frame(width: 350)
        }
    }

    var body: some View {
        ScrollView {
            VStack(spacing: 24) {
                DayNavHeader(viewModel: viewModel)

                if viewModel.loadFailed {
                    ServerUnreachableMac { await viewModel.refresh() }
                        .frame(minHeight: 400)
                } else {
                    loadedContent
                }
            }
            .padding(24)
            .background(Color.scoredayBackgroundDev)
            .navigationTitle("Today")
            .toolbar {
                ToolbarItem(placement: .navigation) {
                    Button(action: { }) {
                        Image(systemName: "sidebar.left")
                    }
                }
                ToolbarItem(placement: .primaryAction) {
                    NavigationLink {
                        SettingsView()
                    } label: {
                        Image(systemName: "gearshape")
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
            .onChange(of: viewModel.selectedDate) { _, _ in
                _Concurrency.Task { await viewModel.refresh() }
            }
        }
    }
}

/// ‹ [day] › navigation so any past day can be reviewed and back-filled.
struct DayNavHeader: View {
    @ObservedObject var viewModel: TodayViewModel

    private var label: String {
        if viewModel.isToday { return "Today" }
        return viewModel.selectedDate.date.map { DateFormatter.fullDate.string(from: $0) }
            ?? viewModel.selectedDate.isoString
    }

    var body: some View {
        HStack(spacing: 16) {
            Button { viewModel.goToPreviousDay() } label: {
                Image(systemName: "chevron.left")
            }
            .buttonStyle(.borderless)

            Text(label)
                .font(.headline)
                .frame(minWidth: 240)

            Button { viewModel.goToNextDay() } label: {
                Image(systemName: "chevron.right")
            }
            .buttonStyle(.borderless)
            .disabled(viewModel.isToday)  // no future days

            if !viewModel.isToday {
                Button("Today") { viewModel.goToToday() }
                    .buttonStyle(.bordered)
            }

            Spacer()
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

// Reuse iOS components with macOS adaptations
struct ScoreCard: View {
    let earned: Int
    let max: Int
    let percentage: Int
    let completedCount: Int
    let incompleteCount: Int
    let streak: Int

    var body: some View {
        HStack(spacing: 24) {
            VStack(alignment: .leading, spacing: 8) {
                Text("Today's Score")
                    .font(.caption)
                    .fontWeight(.semibold)
                    .foregroundStyle(Color.scoredayTextSecondaryDev)
                    .textCase(.uppercase)
                    .tracking(1)

                HStack(alignment: .firstTextBaseline, spacing: 8) {
                    Text("\(earned)")
                        .font(.system(size: 56, weight: .black))
                        .foregroundStyle(Color.scoredayTextPrimaryDev)
                    Text("/ \(max)")
                        .font(.title)
                        .fontWeight(.medium)
                        .foregroundStyle(Color.scoredayTextSecondaryDev)
                }

                Text("\(completedCount) completed · \(incompleteCount) remaining · 🔥 \(streak) day streak")
                    .font(.subheadline)
                    .foregroundStyle(Color.scoredayTextSecondaryDev)
            }

            Spacer()

            VStack(alignment: .trailing, spacing: 4) {
                Text("\(percentage)%")
                    .font(.system(size: 72, weight: .black))
                    .foregroundStyle(Color.scoredayAccentDev)

                Text("Daily Percentage")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(24)
        .background(Color.scoredaySurfaceDev)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.scoredayBorderDev, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct TasksSection: View {
    @ObservedObject var viewModel: TodayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Today's Tasks")
                    .font(.headline)
                    .foregroundStyle(.primary)

                Spacer()

                if !viewModel.tasks.isEmpty {
                    Text("\(viewModel.completedCount)/\(viewModel.tasks.count)")
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                }
            }

            if viewModel.tasks.isEmpty {
                EmptyTodayViewMac()
            } else {
                VStack(spacing: 12) {
                    ForEach(viewModel.tasks) { task in
                        TaskRowViewMac(
                            task: task,
                            isLoading: viewModel.loadingTaskId == task.id,
                            onToggle: { await viewModel.toggle(task) }
                        )
                    }
                }
            }
        }
    }
}

struct EmptyTodayViewMac: View {
    var body: some View {
        VStack(spacing: 16) {
            Image(systemName: "checklist.unchecked")
                .font(.system(size: 64))
                .foregroundStyle(.secondary.opacity(0.5))

            Text("No tasks for today")
                .font(.title2)
                .fontWeight(.bold)
                .foregroundStyle(.primary)

            Text("Create your first task to start scoring")
                .font(.body)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 60)
        .background(Color.scoredaySurfaceDev)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(style: StrokeStyle(lineWidth: 1, dash: [8]))
                .foregroundStyle(Color.scoredayBorderDev)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct TaskRowViewMac: View {
    let task: Task
    let isLoading: Bool
    let onToggle: () async -> Void

    private var isCompleted: Bool {
        task.statusForToday == .completed
    }

    var body: some View {
        HStack(spacing: 16) {
            // Checkbox
            Button(action: { _Concurrency.Task { await onToggle() } }) {
                ZStack {
                    RoundedRectangle(cornerRadius: 8)
                        .stroke(isCompleted ? Color.scoredayAccentDev : Color.scoredayBorderDev, lineWidth: 2)
                        .frame(width: 36, height: 36)

                    if isCompleted {
                        Image(systemName: "checkmark")
                            .font(.system(size: 18, weight: .bold))
                            .foregroundStyle(Color.scoredayAccentDev)
                    }
                }
            }
            .buttonStyle(.plain)
            .disabled(isLoading)

            // Task info
            VStack(alignment: .leading, spacing: 4) {
                HStack(spacing: 8) {
                    Text(task.title)
                        .font(.body)
                        .fontWeight(.semibold)
                        .foregroundStyle(isCompleted ? .secondary : .primary)
                        .strikethrough(isCompleted)

                    if let category = task.category {
                        CategoryBadge(category: category)
                    }
                }

                Text("+\(task.points) pts · \(task.recurrence.displayString)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            // Action button
            if task.statusForToday == .completed {
                Button("Undo") { _Concurrency.Task { await onToggle() } }
                    .buttonStyle(SecondaryButtonStyleMac())
                    .disabled(isLoading)
            } else if task.statusForToday == .overdue {
                Button("Complete +\(task.points)") { _Concurrency.Task { await onToggle() } }
                    .buttonStyle(DestructiveButtonStyleMac())
                    .disabled(isLoading)
            } else {
                Button("Complete +\(task.points)") { _Concurrency.Task { await onToggle() } }
                    .buttonStyle(PrimaryButtonStyleMac())
                    .disabled(isLoading)
            }
        }
        .padding(16)
        .background(backgroundColor)
        .overlay(
            RoundedRectangle(cornerRadius: 12)
                .stroke(borderColor, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private var backgroundColor: Color {
        if task.statusForToday == .completed {
            return Color.scoredaySurfaceDev.opacity(0.7)
        } else if task.statusForToday == .overdue {
            return Color(hex: 0xEF4444).opacity(0.1)
        }
        return Color.scoredaySurfaceDev
    }

    private var borderColor: Color {
        if task.statusForToday == .completed {
            return Color.scoredayBorderDev.opacity(0.5)
        } else if task.statusForToday == .overdue {
            return Color(hex: 0xEF4444).opacity(0.5)
        }
        return Color.scoredayBorderDev
    }
}


struct ComingUpSection: View {
    let tasks: [Task]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Coming Up")
                .font(.subheadline)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(1)

            VStack(spacing: 8) {
                ForEach(tasks) { task in
                    HStack {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(task.title)
                                .font(.subheadline)
                                .fontWeight(.medium)
                            if let category = task.category {
                                CategoryBadge(category: category)
                            }
                        }
                        Spacer()
                        Text("\(task.recurrence.dueDate?.isoString ?? "") · +\(task.points) pts")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                    .padding(12)
                    .background(Color.scoredaySurfaceDev.opacity(0.5))
                    .overlay(
                        RoundedRectangle(cornerRadius: 12)
                            .stroke(style: StrokeStyle(lineWidth: 1, dash: [6]))
                            .foregroundStyle(Color.scoredayBorderDev)
                    )
                    .clipShape(RoundedRectangle(cornerRadius: 12))
                }
            }
        }
    }
}

struct WeeklySummarySection: View {
    @ObservedObject var viewModel: TodayViewModel

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            HStack {
                VStack(alignment: .leading, spacing: 4) {
                    Text("This Week")
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .textCase(.uppercase)
                        .tracking(1)

                    HStack(alignment: .firstTextBaseline, spacing: 4) {
                        Text("\(viewModel.weeklyEarned)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("/ \(viewModel.weeklyMax)")
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Spacer()

                Text("\(viewModel.weeklyPercentage)%")
                    .font(.title2)
                    .fontWeight(.black)
                    .foregroundStyle(Color.scoredayAccentDev)
            }

            // Week grid
            HStack(spacing: 8) {
                ForEach(viewModel.weeklyOverview) { day in
                    TodayWeekDayCell(day: day)
                }
            }
        }
        .padding(20)
        .background(Color.scoredaySurfaceDev)
        .overlay(
            RoundedRectangle(cornerRadius: 16)
                .stroke(Color.scoredayBorderDev, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 16))
    }
}

struct TodayWeekDayCell: View {
    let day: WeeklyDay

    var body: some View {
        VStack(spacing: 6) {
            Text(day.label)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Text(day.isFuture ? "–" : "\(day.percentage)%")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(dayColor)

            if !day.isFuture && day.max > 0 {
                Text("\(day.earned)/\(day.max)")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 80)
        .background(cellBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 10)
                .stroke(borderColor, lineWidth: day.isFuture ? 1 : 0)
        )
        .clipShape(RoundedRectangle(cornerRadius: 10))
    }

    private var dayColor: Color {
        if day.isFuture { return .secondary.opacity(0.4) }
        if day.percentage >= 100 { return Color(hex: 0x10B981) }
        if day.percentage > 0 { return Color(hex: 0x6366F1) }
        return .secondary
    }

    private var cellBackground: Color {
        if day.isFuture { return Color.clear }
        if day.percentage >= 100 { return Color(hex: 0x10B981).opacity(0.15) }
        return Color.scoredaySurfaceDev
    }

    private var borderColor: Color {
        day.isFuture ? Color.scoredayBorderDev : (day.percentage >= 100 ? Color(hex: 0x10B981) : Color.scoredayBorderDev)
    }
}
