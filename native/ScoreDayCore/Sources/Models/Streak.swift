import Foundation

public struct StreakData: Codable, Equatable, Sendable {
    public let currentStreak: Int
    public let bestStreak: Int
    public let consistencyRate: Int
    public let successfulDays: Int
    public let scheduledDays: Int

    public init(
        currentStreak: Int,
        bestStreak: Int,
        consistencyRate: Int,
        successfulDays: Int,
        scheduledDays: Int
    ) {
        self.currentStreak = currentStreak
        self.bestStreak = bestStreak
        self.consistencyRate = consistencyRate
        self.successfulDays = successfulDays
        self.scheduledDays = scheduledDays
    }
}

public struct ConsistencyRate: Codable, Equatable, Sendable {
    public let rate: Int
    public let successfulDays: Int
    public let scheduledDays: Int
}