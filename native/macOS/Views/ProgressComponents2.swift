import SwiftUI
import ScoreDayCore

// MARK: - Weekly Progress

struct WeeklyProgressViewMac: View {
    let progress: WeeklyProgress

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
                        Text("\(progress.earned)")
                            .font(.title2)
                            .fontWeight(.bold)
                        Text("/ \(progress.max)")
                            .foregroundStyle(.secondary)
                    }
                }

                Spacer()

                Text("\(progress.percentage)%")
                    .font(.title2)
                    .fontWeight(.black)
                    .foregroundStyle(Color(hex: 0x6366F1))
            }

            // Daily breakdown
            VStack(alignment: .leading, spacing: 8) {
                Text("Daily Breakdown")
                    .font(.headline)

                HStack(spacing: 8) {
                    ForEach(progress.dailyBreakdown) { day in
                        WeeklyDayCellMac(day: day)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct WeeklyDayCellMac: View {
    let day: DailyScore

    var body: some View {
        let label = day.date.date.map { DateFormatter.shortWeekday.string(from: $0) } ?? ""

        VStack(spacing: 6) {
            Text(label)
                .font(.caption2)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)

            Text(day.hasScheduledTasks ? "\(day.percentage)%" : "–")
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(dayColor)

            if day.hasScheduledTasks {
                Text("\(day.earned)/\(day.max)")
                    .font(.system(size: 10))
                    .foregroundStyle(.secondary)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 80)
        .background(cellBackground)
        .overlay(
            RoundedRectangle(cornerRadius: 8)
                .stroke(borderColor, lineWidth: 1)
        )
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var dayColor: Color {
        if day.percentage >= 100 { return Color(hex: 0x10B981) }
        if day.percentage > 0 { return Color(hex: 0x6366F1) }
        return .secondary
    }

    private var cellBackground: Color {
        if day.percentage >= 100 { return Color(hex: 0x10B981).opacity(0.15) }
        return Color(hex: 0x11161E)
    }

    private var borderColor: Color {
        day.percentage >= 100 ? Color(hex: 0x10B981) : Color(hex: 0x1E293B)
    }
}

// MARK: - Consistency

struct ConsistencyViewMac: View {
    let streak: StreakData?

    var body: some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Consistency")
                .font(.headline)

            Text("Perfect-score days this period · a day counts when every scheduled task is done")
                .font(.caption)
                .foregroundStyle(.secondary)

            HStack(spacing: 20) {
                ConsistencyStatMac(
                    label: "Current Streak",
                    value: "\(streak?.currentStreak ?? 0)",
                    unit: "days",
                    color: Color(hex: 0x6366F1)
                )
                ConsistencyStatMac(
                    label: "Best Streak",
                    value: "\(streak?.bestStreak ?? 0)",
                    unit: "days",
                    color: .secondary
                )
                ConsistencyStatMac(
                    label: "Consistency",
                    value: "\(streak?.consistencyRate ?? 0)%",
                    color: colorForScore(streak?.consistencyRate ?? 0)
                )
            }

            if let streak = streak {
                Text("\(streak.successfulDays) of \(streak.scheduledDays) days perfect")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    private func colorForScore(_ score: Int) -> Color {
        if score >= 81 { return Color(hex: 0x10B981) }
        if score >= 61 { return Color(hex: 0x6366F1) }
        if score >= 41 { return Color(hex: 0xF59E0B) }
        return .secondary
    }
}

struct ConsistencyStatMac: View {
    let label: String
    let value: String
    var unit: String = ""
    let color: Color

    var body: some View {
        VStack(spacing: 4) {
            Text(label)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(1)

            HStack(alignment: .firstTextBaseline, spacing: 2) {
                Text(value)
                    .font(.system(size: 28, weight: .black))
                    .foregroundStyle(color)
                if !unit.isEmpty {
                    Text(unit)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }
        }
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Task Performance

struct TaskPerformanceViewMac: View {
    let items: [TaskPerformance]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Task Performance")
                .font(.headline)

            Text("Weakest first · this month")
                .font(.caption)
                .foregroundStyle(.secondary)

            if items.isEmpty {
                Text("No task performance data yet.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 8) {
                    ForEach(items) { item in
                        TaskPerformanceRowMac(item: item)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct TaskPerformanceRowMac: View {
    let item: TaskPerformance

    private var available: Int {
        item.scheduledOccurrences * item.points
    }

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(item.title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Text("\(item.completionRate)%")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(colorForScore(item.completionRate))
            }

            ProgressView(value: Double(item.completionRate), total: 100)
                .tint(colorForScore(item.completionRate))

            Text("\(item.completedOccurrences) of \(item.scheduledOccurrences) completed · \(item.pointsEarned)/\(available) pts")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(Color(hex: 0x0B0E14))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func colorForScore(_ score: Int) -> Color {
        if score >= 81 { return Color(hex: 0x10B981) }
        if score >= 61 { return Color(hex: 0x6366F1) }
        if score >= 41 { return Color(hex: 0xF59E0B) }
        return .secondary
    }
}

// MARK: - Category Performance

struct CategoryPerformanceViewMac: View {
    let items: [CategoryPerformance]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Category Performance")
                .font(.headline)

            Text("Weakest first · this month")
                .font(.caption)
                .foregroundStyle(.secondary)

            if items.isEmpty {
                Text("No categorized tasks yet.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 8) {
                    ForEach(items) { item in
                        CategoryPerformanceRowMac(item: item)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct CategoryPerformanceRowMac: View {
    let item: CategoryPerformance

    var body: some View {
        VStack(spacing: 8) {
            HStack {
                Text(item.category)
                    .font(.subheadline)
                    .fontWeight(.medium)

                Spacer()

                Text("\(item.completionRate)%")
                    .font(.subheadline)
                    .fontWeight(.bold)
                    .foregroundStyle(colorForScore(item.completionRate))
            }

            ProgressView(value: Double(item.completionRate), total: 100)
                .tint(colorForScore(item.completionRate))

            Text("\(item.completedOccurrences) of \(item.scheduledOccurrences) completed · \(item.pointsEarned) pts earned")
                .font(.caption)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(16)
        .background(Color(hex: 0x0B0E14))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private func colorForScore(_ score: Int) -> Color {
        if score >= 81 { return Color(hex: 0x10B981) }
        if score >= 61 { return Color(hex: 0x6366F1) }
        if score >= 41 { return Color(hex: 0xF59E0B) }
        return .secondary
    }
}

// MARK: - Missed

struct MissedViewMac: View {
    let items: [MissedOccurrence]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Missed")
                .font(.headline)

            Text("Scheduled, passed, not completed · this month")
                .font(.caption)
                .foregroundStyle(.secondary)

            if items.isEmpty {
                Text("No missed tasks in this period.")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity, alignment: .center)
                    .padding(.vertical, 20)
            } else {
                VStack(spacing: 8) {
                    ForEach(items.prefix(10)) { item in
                        MissedRowMac(item: item)
                    }

                    if items.count > 10 {
                        Text("+\(items.count - 10) more missed in this period")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct MissedRowMac: View {
    let item: MissedOccurrence

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(item.taskTitle)
                    .font(.subheadline)
                    .fontWeight(.medium)

                HStack(spacing: 4) {
                    if let date = item.occurrenceDate {
                        Text(date.date.map { DateFormatter.shortDate.string(from: $0) } ?? "")
                    }
                    if let category = item.category {
                        Text("· \(category)")
                    }
                }
                .font(.caption)
                .foregroundStyle(.secondary)
            }

            Spacer()

            Text("\(item.points) pts")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(Color(hex: 0xEF4444))
        }
        .padding(12)
        .background(Color(hex: 0xEF4444).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }
}

// MARK: - Trend

struct TrendViewMac: View {
    let trend: TrendComparison?

    var body: some View {
        if let trend, let previous = trend.previous {
            content(trend, previous)
        }
    }

    private func content(_ trend: TrendComparison, _ previous: TrendComparison.PeriodMetrics) -> some View {
        VStack(alignment: .leading, spacing: 16) {
            Text("Monthly Trend")
                .font(.headline)

            HStack(spacing: 16) {
                TrendCardMac(
                    title: "Avg Score",
                    current: "\(trend.current.averageScore)%",
                    previous: "\(previous.averageScore)%",
                    change: trend.averageScoreChange
                )
                TrendCardMac(
                    title: "Completion",
                    current: "\(trend.current.completionRate)%",
                    previous: "\(previous.completionRate)%",
                    change: trend.completionRateChange
                )
                TrendCardMac(
                    title: "Points",
                    current: "\(trend.current.totalPoints)",
                    previous: "\(previous.totalPoints)",
                    change: trend.pointsChange
                )
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct TrendCardMac: View {
    let title: String
    let current: String
    let previous: String
    let change: Int?

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .tracking(1)

            HStack(alignment: .center, spacing: 8) {
                Text(current)
                    .font(.title2)
                    .fontWeight(.black)

                if let change = change {
                    HStack(spacing: 2) {
                        Image(systemName: change > 0 ? "arrow.up" : "arrow.down")
                        Text("\(abs(change))%")
                    }
                    .font(.caption)
                    .fontWeight(.medium)
                    .foregroundStyle(change > 0 ? Color(hex: 0x10B981) : Color(hex: 0xEF4444))
                }
            }

            Text("vs last: \(previous)")
                .font(.caption)
                .foregroundStyle(.secondary)
        }
        .frame(maxWidth: .infinity)
        .padding(20)
        .background(Color(hex: 0x0B0E14))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// MARK: - Day Detail Sheet

struct DayDetailSheetMac: View {
    let detail: DayDetail
    @Environment(\.dismiss) private var dismiss

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 20) {
                    // Header
                    VStack(spacing: 8) {
                        Text(detail.date.date.map { DateFormatter.fullDate.string(from: $0) } ?? detail.date.isoString)
                            .font(.title)
                            .fontWeight(.bold)

                        Text("Daily Performance")
                            .font(.caption)
                            .foregroundStyle(.secondary)
                    }

                    // Score
                    HStack(alignment: .bottom, spacing: 8) {
                        Text("\(detail.percentage)%")
                            .font(.system(size: 64, weight: .black))
                            .foregroundStyle(colorForScore(detail.percentage))

                        Text("\(detail.earned) / \(detail.max) points")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)
                            .padding(.bottom, 8)
                    }

                    // Completed
                    if !detail.completedTasks.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Completed (\(detail.completedTasks.count))")
                                .font(.subheadline)
                                .fontWeight(.semibold)

                            ForEach(detail.completedTasks, id: \.taskId) { task in
                                DetailTaskRowMac(title: task.title, category: task.category, points: task.pointsEarned, completed: true)
                            }
                        }
                    }

                    // Missed
                    if !detail.missedTasks.isEmpty {
                        VStack(alignment: .leading, spacing: 12) {
                            Text("Missed (\(detail.missedTasks.count))")
                                .font(.subheadline)
                                .fontWeight(.semibold)
                                .foregroundStyle(Color(hex: 0xEF4444))

                            ForEach(detail.missedTasks, id: \.taskId) { task in
                                DetailTaskRowMac(title: task.title, category: task.category, points: task.points, completed: false)
                            }
                        }
                    }
                }
                .padding(24)
            }
            .navigationTitle(detail.date.date.map { DateFormatter.fullDate.string(from: $0) } ?? "")
            .toolbar {
                ToolbarItem(placement: .confirmationAction) {
                    Button("Done") { }
                }
            }
        }
    }

    private func colorForScore(_ score: Int) -> Color {
        if score >= 81 { return Color(hex: 0x10B981) }
        if score >= 61 { return Color(hex: 0x6366F1) }
        if score >= 41 { return Color(hex: 0xF59E0B) }
        return .secondary
    }
}

struct DetailTaskRowMac: View {
    let title: String
    let category: String?
    let points: Int
    let completed: Bool

    var body: some View {
        HStack {
            Image(systemName: completed ? "checkmark.circle.fill" : "circle")
                .foregroundStyle(completed ? Color(hex: 0x10B981) : Color(hex: 0xEF4444))

            VStack(alignment: .leading, spacing: 2) {
                Text(title)
                    .font(.subheadline)
                    .fontWeight(.medium)

                if let category = category {
                    Text(category)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
            }

            Spacer()

            Text("+\(points)")
                .font(.caption)
                .fontWeight(.semibold)
                .foregroundStyle(completed ? Color(hex: 0x10B981) : Color(hex: 0xEF4444))
        }
        .padding(12)
        .background(completed ? Color(hex: 0x10B981).opacity(0.1) : Color(hex: 0xEF4444).opacity(0.1))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}