import Foundation

public enum TaskStatus: String, Codable, CaseIterable, Sendable {
    case notDue = "NOT_DUE"
    case due = "DUE"
    case completed = "COMPLETED"
    case missed = "MISSED"
    case upcoming = "UPCOMING"
    case overdue = "OVERDUE"
    case satisfied = "SATISFIED"
}

public struct Task: Codable, Identifiable, Equatable, Sendable {
    public let id: String
    public var title: String
    public var description: String?
    public var category: String?
    public var points: Int
    public var recurrence: Recurrence
    public var active: Bool
    public let createdAt: Date
    public var updatedAt: Date
    /// Server-computed status (only sent by /api/dashboard).
    public var serverStatus: TaskStatus? = nil

    public init(
        id: String = UUID().uuidString,
        title: String,
        description: String? = nil,
        category: String? = nil,
        points: Int = 10,
        recurrence: Recurrence = Recurrence(),
        active: Bool = true,
        createdAt: Date = Date(),
        updatedAt: Date = Date()
    ) {
        self.id = id
        self.title = title
        self.description = description
        self.category = category
        self.points = max(1, min(10, points))
        self.recurrence = recurrence
        self.active = active
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// Server sends recurrence as flat columns (see prisma Task model), weekdays as CSV,
// and timestamps with fractional seconds.
extension Task {
    private enum CodingKeys: String, CodingKey {
        case id, title, description, category, points, active, createdAt, updatedAt, status
        case recurrenceType, interval, unit, selectedWeekdays, daysOfWeek, dayOfMonth, dueDate, startDate, endDate
    }

    public init(from decoder: Decoder) throws {
        let c = try decoder.container(keyedBy: CodingKeys.self)
        let csv = try c.decodeIfPresent(String.self, forKey: .selectedWeekdays)
            ?? c.decodeIfPresent(String.self, forKey: .daysOfWeek)
        let date = { (k: CodingKeys) in try c.decodeIfPresent(String.self, forKey: k).flatMap(LocalDate.parse) }
        let stamp = { (k: CodingKeys) in try c.decodeIfPresent(String.self, forKey: k).flatMap(Task.parseTimestamp) ?? Date() }
        self.init(
            id: try c.decode(String.self, forKey: .id),
            title: try c.decode(String.self, forKey: .title),
            description: try c.decodeIfPresent(String.self, forKey: .description),
            category: try c.decodeIfPresent(String.self, forKey: .category),
            points: try c.decodeIfPresent(Int.self, forKey: .points) ?? 10,
            recurrence: Recurrence(
                type: try c.decodeIfPresent(RecurrenceType.self, forKey: .recurrenceType) ?? .none,
                interval: try c.decodeIfPresent(Int.self, forKey: .interval) ?? 1,
                unit: try c.decodeIfPresent(RecurrenceUnit.self, forKey: .unit),
                selectedWeekdays: csv?.split(separator: ",").compactMap { Int($0.trimmingCharacters(in: .whitespaces)) } ?? [],
                dayOfMonth: try c.decodeIfPresent(Int.self, forKey: .dayOfMonth),
                startDate: try date(.startDate),
                endDate: try date(.endDate),
                dueDate: try date(.dueDate)
            ),
            active: try c.decodeIfPresent(Bool.self, forKey: .active) ?? true,
            createdAt: try stamp(.createdAt),
            updatedAt: try stamp(.updatedAt)
        )
        self.serverStatus = try c.decodeIfPresent(TaskStatus.self, forKey: .status)
    }

    public func encode(to encoder: Encoder) throws {
        var c = encoder.container(keyedBy: CodingKeys.self)
        try c.encode(id, forKey: .id)
        try c.encode(title, forKey: .title)
        try c.encodeIfPresent(description, forKey: .description)
        try c.encodeIfPresent(category, forKey: .category)
        try c.encode(points, forKey: .points)
        try c.encode(active, forKey: .active)
        try c.encode(recurrence.type, forKey: .recurrenceType)
        try c.encode(recurrence.interval, forKey: .interval)
        try c.encodeIfPresent(recurrence.unit, forKey: .unit)
        if !recurrence.selectedWeekdays.isEmpty {
            try c.encode(recurrence.selectedWeekdays.map(String.init).joined(separator: ","), forKey: .selectedWeekdays)
        }
        try c.encodeIfPresent(recurrence.dayOfMonth, forKey: .dayOfMonth)
        try c.encodeIfPresent(recurrence.dueDate, forKey: .dueDate)
        try c.encodeIfPresent(recurrence.startDate, forKey: .startDate)
        try c.encodeIfPresent(recurrence.endDate, forKey: .endDate)
    }

    static func parseTimestamp(_ s: String) -> Date? {
        let f = ISO8601DateFormatter()
        f.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return f.date(from: s) ?? ISO8601DateFormatter().date(from: s)
    }
}

public extension Task {
    var statusForToday: TaskStatus {
        serverStatus ?? status(for: LocalDate.today())
    }

    func status(for date: LocalDate) -> TaskStatus {
        guard active else { return .missed }
        guard recurrence.isActive else { return .notDue }
        guard !recurrence.isExpired else { return .notDue }

        switch recurrence.type {
        case .none:
            guard let due = recurrence.dueDate else { return .notDue }
            if date < due { return .upcoming }
            if date > due { return .missed }
            return .due

        case .daily:
            return .due

        case .weekly:
            let weekday = date.weekdayZeroBased
            if recurrence.selectedWeekdays.contains(weekday) {
                return .due
            }
            return .notDue

        case .weeklyGoal:
            let weekStart = date.startOfWeek()
            // Weekly goal is "due" any day of the week if not yet completed
            // The server handles SATISFIED status based on completion
            return .due

        case .custom:
            return isDueOnDate(date) ? .due : .notDue
        }
    }

    func isDueOnDate(_ date: LocalDate) -> Bool {
        guard active else { return false }
        guard recurrence.isActive else { return false }
        guard !recurrence.isExpired else { return false }

        switch recurrence.type {
        case .none:
            return recurrence.dueDate == date
        case .daily:
            return true
        case .weekly:
            return recurrence.selectedWeekdays.contains(date.weekdayZeroBased)
        case .weeklyGoal:
            return true  // Any day in the week
        case .custom:
            return isCustomDueOnDate(date)
        }
    }

    private func isCustomDueOnDate(_ date: LocalDate) -> Bool {
        guard let start = recurrence.startDate, date >= start else { return false }
        if let end = recurrence.endDate, date > end { return false }

        switch recurrence.unit {
        case .day:
            let daysDiff = date.daysSince(start) ?? 0
            return daysDiff % recurrence.interval == 0
        case .week:
            let weeksDiff = date.weeksSince(start) ?? 0
            if weeksDiff % recurrence.interval == 0 {
                return recurrence.selectedWeekdays.contains(date.weekdayZeroBased)
            }
            return false
        case .month:
            let monthsDiff = date.monthsSince(start) ?? 0
            if monthsDiff % recurrence.interval == 0 {
                return date.day == recurrence.dayOfMonth
            }
            return false
        case .none:
            return false
        }
    }

    func occurrenceKey(for date: LocalDate) -> String {
        if recurrence.type == .weeklyGoal {
            return date.startOfWeek().isoString
        }
        return date.isoString
    }
}

extension LocalDate {
    func daysSince(_ other: LocalDate) -> Int? {
        guard let d1 = date, let d2 = other.date else { return nil }
        return Calendar.current.dateComponents([.day], from: d2, to: d1).day
    }

    func weeksSince(_ other: LocalDate) -> Int? {
        daysSince(other).map { $0 / 7 }
    }

    func monthsSince(_ other: LocalDate) -> Int? {
        let cal = Calendar.current
        let c1 = cal.dateComponents([.year, .month], from: date!)
        let c2 = cal.dateComponents([.year, .month], from: other.date!)
        return (c1.year! - c2.year!) * 12 + (c1.month! - c2.month!)
    }
}