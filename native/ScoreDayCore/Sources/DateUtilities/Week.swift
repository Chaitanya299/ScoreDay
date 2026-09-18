import Foundation

public struct Week: Codable, Equatable, Hashable, Sendable {
    public let start: LocalDate  // Monday
    public let end: LocalDate    // Sunday

    public init(start: LocalDate) {
        self.start = start
        self.end = start.adding(days: 6) ?? start
    }

    public static func current(calendar: Calendar = .current) -> Week {
        Week(start: LocalDate.today(calendar: calendar).startOfWeek(calendar: calendar))
    }

    public func next(calendar: Calendar = .current) -> Week {
        Week(start: start.adding(days: 7, calendar: calendar) ?? start)
    }

    public func previous(calendar: Calendar = .current) -> Week {
        Week(start: start.adding(days: -7, calendar: calendar) ?? start)
    }

    public var days: [LocalDate] {
        (0..<7).compactMap { start.adding(days: $0) }
    }

    public var isoString: String { start.isoString }

    public var displayString: String {
        let formatter = DateFormatter()
        formatter.dateFormat = "MMM d"
        return "\(formatter.string(from: start.date!)) – \(formatter.string(from: end.date!))"
    }
}