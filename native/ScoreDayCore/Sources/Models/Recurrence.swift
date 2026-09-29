import Foundation

public enum RecurrenceType: String, Codable, CaseIterable, Sendable {
    case none = "NONE"
    case daily = "DAILY"
    case weekly = "WEEKLY"
    case weeklyGoal = "WEEKLY_GOAL"
    case custom = "CUSTOM"

    public var displayName: String {
        switch self {
        case .none: return "Once"
        case .daily: return "Daily"
        case .weekly: return "Weekly"
        case .weeklyGoal: return "Weekly goal"
        case .custom: return "Custom"
        }
    }
}

public enum RecurrenceUnit: String, Codable, CaseIterable, Sendable {
    case day = "DAY"
    case week = "WEEK"
    case month = "MONTH"

    public var displayName: String { rawValue.capitalized }
}

public struct Recurrence: Codable, Equatable, Sendable {
    public var type: RecurrenceType
    public var interval: Int
    public var unit: RecurrenceUnit?
    public var selectedWeekdays: [Int]  // 0=Sun ... 6=Sat
    public var dayOfMonth: Int?
    public var startDate: LocalDate?
    public var endDate: LocalDate?
    public var dueDate: LocalDate?  // For NONE type

    public init(
        type: RecurrenceType = .none,
        interval: Int = 1,
        unit: RecurrenceUnit? = nil,
        selectedWeekdays: [Int] = [],
        dayOfMonth: Int? = nil,
        startDate: LocalDate? = nil,
        endDate: LocalDate? = nil,
        dueDate: LocalDate? = nil
    ) {
        self.type = type
        self.interval = max(1, interval)
        self.unit = unit
        self.selectedWeekdays = selectedWeekdays.sorted()
        self.dayOfMonth = dayOfMonth
        self.startDate = startDate
        self.endDate = endDate
        self.dueDate = dueDate
    }
}

public extension Recurrence {
    var isActive: Bool {
        guard let start = startDate else { return true }
        return start <= LocalDate.today()
    }

    var isExpired: Bool {
        guard let end = endDate else { return false }
        return end < LocalDate.today()
    }
}
public extension Recurrence {
    var displayString: String {
        let days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
        let weekdays = selectedWeekdays.compactMap { days.indices.contains($0) ? days[$0] : nil }.joined(separator: ", ")
        switch type {
        case .none: return dueDate.map { "Once · \($0.isoString)" } ?? "Once"
        case .daily: return "Daily"
        case .weekly: return weekdays.isEmpty ? "Weekly" : "Weekly · \(weekdays)"
        case .weeklyGoal: return "\(interval)× per week"
        case .custom:
            let unitName = unit?.rawValue.lowercased() ?? "day"
            return interval == 1 ? "Every \(unitName)" : "Every \(interval) \(unitName)s"
        }
    }
}
