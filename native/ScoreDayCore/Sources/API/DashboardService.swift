import Foundation

public actor DashboardService {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    /// Pass a date to get that day's scoreboard; omit for today.
    public func fetchDashboard(date: LocalDate? = nil) async throws -> DashboardData {
        if let date {
            return try await client.get("/api/dashboard", query: ["date": date.isoString])
        }
        return try await client.get("/api/dashboard")
    }
}

public struct DashboardData: Codable, Sendable {
    public let targetDate: String
    public let earnedToday: Int
    public let maxDaily: Int
    public let dailyPercentage: Int
    public let weeklyEarned: Int
    public let weeklyMax: Int
    public let weeklyPercentage: Int
    public let completedCount: Int
    public let incompleteCount: Int
    public let streak: Int
    public let taskList: [Task]
    public let weeklyOverview: [WeeklyDay]
    public let upcomingList: [Task]

    public init(
        targetDate: String,
        earnedToday: Int,
        maxDaily: Int,
        dailyPercentage: Int,
        weeklyEarned: Int,
        weeklyMax: Int,
        weeklyPercentage: Int,
        completedCount: Int,
        incompleteCount: Int,
        streak: Int,
        taskList: [Task],
        weeklyOverview: [WeeklyDay],
        upcomingList: [Task]
    ) {
        self.targetDate = targetDate
        self.earnedToday = earnedToday
        self.maxDaily = maxDaily
        self.dailyPercentage = dailyPercentage
        self.weeklyEarned = weeklyEarned
        self.weeklyMax = weeklyMax
        self.weeklyPercentage = weeklyPercentage
        self.completedCount = completedCount
        self.incompleteCount = incompleteCount
        self.streak = streak
        self.taskList = taskList
        self.weeklyOverview = weeklyOverview
        self.upcomingList = upcomingList
    }
}

public struct WeeklyDay: Codable, Identifiable, Sendable {
    public let label: String
    public let date: String
    public let earned: Int
    public let max: Int
    public let percentage: Int
    public let isFuture: Bool

    public init(label: String, date: String, earned: Int, max: Int, percentage: Int, isFuture: Bool) {
        self.label = label
        self.date = date
        self.earned = earned
        self.max = max
        self.percentage = percentage
        self.isFuture = isFuture
    }

    public var id: String { date }
}