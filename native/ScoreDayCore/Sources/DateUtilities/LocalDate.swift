import Foundation

public struct LocalDate: Codable, Equatable, Hashable, Comparable, Sendable {
    public let year: Int
    public let month: Int
    public let day: Int

    public init(year: Int, month: Int, day: Int) {
        self.year = year
        self.month = month
        self.day = day
    }

    public init(_ date: Date, calendar: Calendar = .current) {
        let components = calendar.dateComponents([.year, .month, .day], from: date)
        self.year = components.year!
        self.month = components.month!
        self.day = components.day!
    }

    public static func today(calendar: Calendar = .current) -> LocalDate {
        LocalDate(Date(), calendar: calendar)
    }

    public var date: Date? {
        var components = DateComponents()
        components.year = year
        components.month = month
        components.day = day
        components.hour = 12  // Noon to avoid DST issues
        return Calendar.current.date(from: components)
    }

    public var isoString: String {
        String(format: "%04d-%02d-%02d", year, month, day)
    }

    public static func parse(_ string: String) -> LocalDate? {
        // Split instead of DateFormatter: parsing at UTC then reading local components shifts the day.
        let parts = string.prefix(10).split(separator: "-").compactMap { Int($0) }
        guard parts.count == 3 else { return nil }
        return LocalDate(year: parts[0], month: parts[1], day: parts[2])
    }

    // Server sends "YYYY-MM-DD" strings.
    public init(from decoder: Decoder) throws {
        let c = try decoder.singleValueContainer()
        let s = try c.decode(String.self)
        guard let d = LocalDate.parse(s) else {
            throw DecodingError.dataCorruptedError(in: c, debugDescription: "Bad date \(s)")
        }
        self = d
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.singleValueContainer()
        try c.encode(isoString)
    }

    public func adding(days: Int, calendar: Calendar = .current) -> LocalDate? {
        guard let date = self.date else { return nil }
        return calendar.date(byAdding: .day, value: days, to: date).map { LocalDate($0) }
    }

    public func adding(weeks: Int, calendar: Calendar = .current) -> LocalDate? {
        adding(days: weeks * 7, calendar: calendar)
    }

    public func adding(months: Int, calendar: Calendar = .current) -> LocalDate? {
        guard let date = self.date else { return nil }
        return calendar.date(byAdding: .month, value: months, to: date).map { LocalDate($0) }
    }

    public func startOfWeek(calendar: Calendar = .current) -> LocalDate {
        guard let date = self.date else { return self }
        var cal = calendar
        cal.firstWeekday = 2  // Monday
        let components = cal.dateComponents([.yearForWeekOfYear, .weekOfYear], from: date)
        guard let weekStart = cal.date(from: components) else { return self }
        return LocalDate(weekStart)
    }

    public func endOfWeek(calendar: Calendar = .current) -> LocalDate {
        startOfWeek(calendar: calendar).adding(days: 6) ?? self
    }

    public func startOfMonth(calendar: Calendar = .current) -> LocalDate {
        LocalDate(year: year, month: month, day: 1)
    }

    public func endOfMonth(calendar: Calendar = .current) -> LocalDate {
        guard let date = self.date else { return self }
        let nextMonth = calendar.date(byAdding: .month, value: 1, to: date)!
        let lastDay = calendar.date(byAdding: .day, value: -1, to: nextMonth)!
        return LocalDate(lastDay)
    }

    public var weekday: Int {  // 1=Sun ... 7=Sat (Calendar.current)
        guard let date = date else { return 1 }
        return Calendar.current.component(.weekday, from: date)
    }

    public var weekdayZeroBased: Int {  // 0=Sun ... 6=Sat
        weekday - 1  // Calendar weekday is 1=Sun...7=Sat
    }

    public var isWeekend: Bool {
        weekday == 1 || weekday == 7
    }

    public static func < (lhs: LocalDate, rhs: LocalDate) -> Bool {
        if lhs.year != rhs.year { return lhs.year < rhs.year }
        if lhs.month != rhs.month { return lhs.month < rhs.month }
        return lhs.day < rhs.day
    }

    public var description: String { isoString }
}