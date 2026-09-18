import Foundation

public struct Month: Codable, Equatable, Hashable, Sendable {
    public let year: Int
    public let month: Int

    public init(year: Int, month: Int) {
        self.year = year
        self.month = month
    }

    public init(_ date: LocalDate) {
        self.year = date.year
        self.month = date.month
    }

    public static func current(calendar: Calendar = .current) -> Month {
        let today = LocalDate.today(calendar: calendar)
        return Month(today)
    }

    public var start: LocalDate {
        LocalDate(year: year, month: month, day: 1)
    }

    public var end: LocalDate {
        start.endOfMonth()
    }

    public func next(calendar: Calendar = .current) -> Month {
        if month == 12 {
            return Month(year: year + 1, month: 1)
        }
        return Month(year: year, month: month + 1)
    }

    public func previous(calendar: Calendar = .current) -> Month {
        if month == 1 {
            return Month(year: year - 1, month: 12)
        }
        return Month(year: year, month: month - 1)
    }

    public var days: [LocalDate] {
        var result: [LocalDate] = []
        var current = start
        while current <= end {
            result.append(current)
            current = current.adding(days: 1) ?? current
        }
        return result
    }

    // Server sends "YYYY-MM" strings.
    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        let s = try c.decode(String.self)
        let parts = s.split(separator: "-").compactMap { Int($0) }
        guard parts.count == 2 else {
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Bad month \(s)")
        }
        self.init(year: parts[0], month: parts[1])
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(isoString)
    }

    public var isoString: String {
        String(format: "%04d-%02d", year, month)
    }

    public var displayString: String {
        let date = start.date!
        let formatter = DateFormatter()
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date)
    }

    /// Returns a 6-week grid (42 days) for calendar heatmap
    /// Includes leading/trailing days from adjacent months
    public func calendarGrid(calendar: Calendar = .current) -> [[LocalDate?]] {
        let firstDay = start
        let firstWeekday = firstDay.weekday  // 1=Sun...7=Sat
        let leadingEmpty = (firstWeekday - 1) % 7  // 0-6 empty cells before 1st

        var cells: [LocalDate?] = Array(repeating: nil, count: leadingEmpty)
        cells.append(contentsOf: days.map { Optional($0) })

        // Fill trailing to make 42 cells (6 weeks × 7 days)
        while cells.count < 42 {
            cells.append(nil)
        }

        return cells.chunked(into: 7)
    }
}

extension Array {
    func chunked(into size: Int) -> [[Element]] {
        stride(from: 0, to: count, by: size).map {
            Array(self[$0..<Swift.min($0 + size, count)])
        }
    }
}