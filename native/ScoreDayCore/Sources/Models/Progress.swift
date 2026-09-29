import Foundation

public struct DailyProgress: Codable, Equatable, Sendable {
    public let date: LocalDate
    public let percentage: Int
    public let earned: Int
    public let max: Int
    public let hasScheduledTasks: Bool
    public let completedTasks: [CompletedTaskSummary]
    public let missedTasks: [MissedTaskSummary]

    public init(
        date: LocalDate,
        percentage: Int,
        earned: Int,
        max: Int,
        hasScheduledTasks: Bool,
        completedTasks: [CompletedTaskSummary] = [],
        missedTasks: [MissedTaskSummary] = []
    ) {
        self.date = date
        self.percentage = percentage
        self.earned = earned
        self.max = max
        self.hasScheduledTasks = hasScheduledTasks
        self.completedTasks = completedTasks
        self.missedTasks = missedTasks
    }
}

public struct CompletedTaskSummary: Codable, Equatable, Sendable {
    public let taskId: String
    public let title: String
    public let category: String?
    public let pointsEarned: Int
}

public struct MissedTaskSummary: Codable, Equatable, Sendable {
    public let taskId: String
    public let title: String
    public let category: String?
    public let points: Int
    public let occurrenceKey: String?  // not sent by /api/progress/day
}

public struct WeeklyProgress: Codable, Equatable, Sendable {
    public let weekStart: LocalDate
    public let weekEnd: LocalDate
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let dailyBreakdown: [DailyScore]
}

public struct MonthlyProgress: Codable, Equatable, Sendable {
    public let month: Month
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let averageScore: Int
    public let bestDay: MonthlyScore.BestDay?
    public let totalPoints: Int
    public let completionRate: Int
    public let dailyScores: [DailyScore]
}

public struct TrendComparison: Codable, Equatable, Sendable {
    public let current: PeriodMetrics
    public let previous: PeriodMetrics?
    public let averageScoreChange: Int?
    public let completionRateChange: Int?
    public let pointsChange: Int?

    public struct PeriodMetrics: Codable, Equatable, Sendable {
        public let averageScore: Int
        public let bestDay: MonthlyScore.BestDay?
        public let totalPoints: Int
        public let completionRate: Int
    }
}

public struct DayDetail: Codable, Equatable, Sendable {
    public let date: LocalDate
    public let percentage: Int
    public let earned: Int
    public let max: Int
    public let completedTasks: [CompletedTaskSummary]
    public let missedTasks: [MissedTaskSummary]
}
/// Shape of GET /api/progress/month.
public struct MonthProgressBundle: Codable, Sendable {
    public let monthlyProgress: MonthlyProgress
    public let trend: TrendComparison?
    public let streaks: StreakData?
    public let taskPerformance: [TaskPerformance]
    public let categoryPerformance: [CategoryPerformance]
    public let missed: [MissedOccurrence]
}

/// Shape of GET /api/progress/week.
public struct WeekProgressBundle: Codable, Sendable {
    public let weeklyProgress: WeeklyProgress
    public let streaks: StreakData?
    public let taskPerformance: [TaskPerformance]
    public let categoryPerformance: [CategoryPerformance]
    public let missed: [MissedOccurrence]
}
