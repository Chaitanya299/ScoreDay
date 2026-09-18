import Foundation

public struct DailyScore: Codable, Equatable, Sendable {
    public let date: LocalDate
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let hasScheduledTasks: Bool

    public init(date: LocalDate, earned: Int, max: Int, hasScheduledTasks: Bool) {
        self.date = date
        self.earned = earned
        self.max = max
        self.hasScheduledTasks = hasScheduledTasks
        self.percentage = max > 0 ? min(100, Int(round(Double(earned) / Double(max) * 100))) : 0
    }
}

public struct WeeklyScore: Codable, Equatable, Sendable {
    public let weekStart: LocalDate
    public let weekEnd: LocalDate
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let dailyBreakdown: [DailyScore]

    public init(weekStart: LocalDate, earned: Int, max: Int, dailyBreakdown: [DailyScore]) {
        self.weekStart = weekStart
        self.weekEnd = weekStart.adding(days: 6) ?? weekStart
        self.earned = earned
        self.max = max
        self.dailyBreakdown = dailyBreakdown
        self.percentage = max > 0 ? min(100, Int(round(Double(earned) / Double(max) * 100))) : 0
    }
}

public struct MonthlyScore: Codable, Equatable, Sendable {
    public let month: Month
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let averageScore: Int
    public let bestDay: BestDay?
    public let totalPoints: Int
    public let completionRate: Int
    public let dailyScores: [DailyScore]

    public struct BestDay: Codable, Equatable, Sendable {
        public let date: LocalDate
        public let percentage: Int
    }

    public init(
        month: Month,
        earned: Int,
        max: Int,
        averageScore: Int,
        bestDay: BestDay?,
        totalPoints: Int,
        completionRate: Int,
        dailyScores: [DailyScore]
    ) {
        self.month = month
        self.earned = earned
        self.max = max
        self.averageScore = averageScore
        self.bestDay = bestDay
        self.totalPoints = totalPoints
        self.completionRate = completionRate
        self.dailyScores = dailyScores
        self.percentage = max > 0 ? min(100, Int(round(Double(earned) / Double(max) * 100))) : 0
    }
}

public struct TaskPerformance: Codable, Equatable, Sendable {
    public let taskId: String
    public let title: String
    public let category: String?
    public let points: Int
    public let recurrenceType: RecurrenceType
    public let scheduledOccurrences: Int
    public let completedOccurrences: Int
    public let completionRate: Int
    public let pointsEarned: Int

    public init(
        taskId: String,
        title: String,
        category: String?,
        points: Int,
        recurrenceType: RecurrenceType,
        scheduledOccurrences: Int,
        completedOccurrences: Int,
        pointsEarned: Int
    ) {
        self.taskId = taskId
        self.title = title
        self.category = category
        self.points = points
        self.recurrenceType = recurrenceType
        self.scheduledOccurrences = scheduledOccurrences
        self.completedOccurrences = completedOccurrences
        self.pointsEarned = pointsEarned
        self.completionRate = scheduledOccurrences > 0
            ? min(100, Int(round(Double(completedOccurrences) / Double(scheduledOccurrences) * 100)))
            : 0
    }
}

public struct CategoryPerformance: Codable, Equatable, Sendable {
    public let category: String
    public let scheduledOccurrences: Int
    public let completedOccurrences: Int
    public let completionRate: Int
    public let pointsEarned: Int

    public init(
        category: String,
        scheduledOccurrences: Int,
        completedOccurrences: Int,
        pointsEarned: Int
    ) {
        self.category = category
        self.scheduledOccurrences = scheduledOccurrences
        self.completedOccurrences = completedOccurrences
        self.pointsEarned = pointsEarned
        self.completionRate = scheduledOccurrences > 0
            ? min(100, Int(round(Double(completedOccurrences) / Double(scheduledOccurrences) * 100)))
            : 0
    }
}

public struct MissedOccurrence: Codable, Equatable, Sendable {
    public let taskId: String
    public let taskTitle: String
    public let category: String?
    public let occurrenceKey: String
    public let points: Int

    private enum CodingKeys: String, CodingKey {
        case taskId, taskTitle, category, points
        case occurrenceKey = "occurrenceDate"
    }

    public var occurrenceDate: LocalDate? {
        LocalDate.parse(occurrenceKey)
    }
}
extension DailyScore: Identifiable { public var id: String { date.isoString } }
extension TaskPerformance: Identifiable { public var id: String { taskId } }
extension CategoryPerformance: Identifiable { public var id: String { category } }
extension MissedOccurrence: Identifiable { public var id: String { taskId + "|" + occurrenceKey } }
