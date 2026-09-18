import SwiftUI
import Charts
import ScoreDayCore

// MARK: - Chart

struct ScoreChartViewMac: View {
    let dailyScores: [DailyScore]

    private var chartData: [ChartPoint] {
        dailyScores
            .filter { $0.hasScheduledTasks }
            .map { score in
                ChartPoint(
                    date: score.date,
                    percentage: score.percentage,
                    earned: score.earned,
                    max: score.max
                )
            }
    }

    struct ChartPoint: Identifiable {
        let id = UUID()
        let date: LocalDate
        let percentage: Int
        let earned: Int
        let max: Int
    }

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Score History")
                .font(.headline)
                .foregroundStyle(.primary)

            if chartData.isEmpty {
                EmptyChartViewMac()
            } else {
                Chart(chartData) { point in
                    LineMark(
                        x: .value("Date", point.date.date ?? Date()),
                        y: .value("Score", point.percentage)
                    )
                    .foregroundStyle(Color(hex: 0x6366F1))
                    .lineStyle(StrokeStyle(lineWidth: 3, lineCap: .round, lineJoin: .round))

                    PointMark(
                        x: .value("Date", point.date.date ?? Date()),
                        y: .value("Score", point.percentage)
                    )
                    .foregroundStyle(Color(hex: 0x6366F1))
                    .symbolSize(60)
                }
                .chartYScale(domain: 0...100)
                .chartXAxis {
                    AxisMarks(values: .stride(by: .day, count: 7)) { _ in
                        AxisGridLine()
                        AxisValueLabel(format: .dateTime.month().day())
                    }
                }
                .chartYAxis {
                    AxisMarks(position: .leading) { value in
                        AxisGridLine()
                        AxisValueLabel {
                            if let intValue = value.as(Int.self) {
                                Text("\(intValue)%")
                            }
                        }
                    }
                }
                .frame(height: 300)
                .chartBackground { proxy in
                    GeometryReader { geo in
                        Rectangle()
                            .fill(Color(hex: 0x11161E))
                            .frame(width: geo.size.width, height: geo.size.height)
                    }
                }
            }
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct EmptyChartViewMac: View {
    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "chart.line.uptrend.xyaxis")
                .font(.system(size: 48))
                .foregroundStyle(.secondary.opacity(0.5))
            Text("No score data available for this period")
                .font(.body)
                .foregroundStyle(.secondary)
        }
        .frame(height: 300)
        .frame(maxWidth: .infinity)
    }
}

// MARK: - Activity Calendar

struct ActivityCalendarViewMac: View {
    let month: Month
    let dailyScores: [DailyScore]

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Activity Calendar")
                .font(.headline)

            // Weekday headers
            HStack(spacing: 0) {
                ForEach(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], id: \.self) { day in
                    Text(day)
                        .font(.caption2)
                        .fontWeight(.semibold)
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity)
                }
            }

            // Calendar grid
            LazyVGrid(columns: Array(repeating: GridItem(.flexible(), spacing: 6), count: 7), spacing: 6) {
                ForEach(month.calendarGrid(), id: \.self) { week in
                    ForEach(week.indices, id: \.self) { dayIndex in
                        if let date = week[dayIndex] {
                            CalendarCellMac(date: date, percentage: dailyScores.first(where: { $0.date == date })?.percentage)
                        } else {
                            Color.clear
                                .frame(height: 40)
                        }
                    }
                }
            }

            // Legend
            HStack(spacing: 20) {
                LegendItemMac(color: Color(hex: 0x11161E), label: "No data")
                LegendItemMac(color: Color(hex: 0xF59E0B), label: "0–20%")
                LegendItemMac(color: Color(hex: 0xF59E0B), label: "21–40%")
                LegendItemMac(color: Color(hex: 0x6366F1), label: "41–60%")
                LegendItemMac(color: Color(hex: 0x10B981), label: "81–100%")
            }
            .font(.caption)
        }
        .padding(20)
        .background(Color(hex: 0x11161E))
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

struct LegendItemMac: View {
    let color: Color
    let label: String

    var body: some View {
        HStack(spacing: 6) {
            Circle()
                .fill(color)
                .frame(width: 12, height: 12)
            Text(label)
                .foregroundStyle(.secondary)
        }
    }
}

struct CalendarCellMac: View {
    let date: LocalDate
    let percentage: Int?

    var body: some View {
        VStack(spacing: 2) {
            Text("\(date.day)")
                .font(.caption)
                .fontWeight(.medium)
                .foregroundStyle(textColor)

            if let pct = percentage {
                Text("\(pct)%")
                    .font(.system(size: 10))
                    .foregroundStyle(textColor)
            }
        }
        .frame(maxWidth: .infinity, minHeight: 40)
        .background(cellColor)
        .clipShape(RoundedRectangle(cornerRadius: 8))
    }

    private var cellColor: Color {
        guard let pct = percentage else { return Color(hex: 0x11161E) }
        if pct >= 81 { return Color(hex: 0x10B981) }
        if pct >= 61 { return Color(hex: 0x6366F1) }
        if pct >= 41 { return Color(hex: 0xF59E0B) }
        if pct > 0 { return Color(hex: 0xF59E0B).opacity(0.5) }
        return Color(hex: 0x1E293B).opacity(0.3)
    }

    private var textColor: Color {
        guard let pct = percentage else { return .secondary }
        if pct >= 41 { return .white }
        return .primary
    }
}
