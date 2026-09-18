import Foundation

public struct TaskCompletion: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public let taskId: String
    public let occurrenceKey: String  // The occurrence this completes (date or week-start)
    public let completedOn: LocalDate  // The calendar date when user tapped complete
    public let pointsEarned: Int
    public let completedAt: Date

    public init(
        id: String = UUID().uuidString,
        taskId: String,
        occurrenceKey: String,
        completedOn: LocalDate,
        pointsEarned: Int,
        completedAt: Date = Date()
    ) {
        self.id = id
        self.taskId = taskId
        self.occurrenceKey = occurrenceKey
        self.completedOn = completedOn
        self.pointsEarned = pointsEarned
        self.completedAt = completedAt
    }
}

public extension TaskCompletion {
    var occurrenceDate: LocalDate? {
        LocalDate.parse(occurrenceKey)
    }
}