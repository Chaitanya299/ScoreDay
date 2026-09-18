import Foundation

public struct TaskValidation {
    public struct Result {
        public let isValid: Bool
        public let errors: [String]

        public init(isValid: Bool, errors: [String] = []) {
            self.isValid = isValid
            self.errors = errors
        }
    }

    public static func validate(_ task: Task) -> Result {
        var errors: [String] = []

        if task.title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            errors.append("Title is required")
        }

        if task.points < 1 || task.points > 10 {
            errors.append("Points must be 1-10")
        }

        switch task.recurrence.type {
        case .weekly:
            if task.recurrence.selectedWeekdays.isEmpty {
                errors.append("Select at least one day for weekly recurrence")
            }
        case .none:
            if task.recurrence.dueDate == nil {
                errors.append("Due date is required for one-time tasks")
            } else if let due = task.recurrence.dueDate, due < LocalDate.today() {
                errors.append("Due date cannot be in the past")
            }
        case .custom:
            if task.recurrence.unit == .month, let day = task.recurrence.dayOfMonth {
                if day < 1 || day > 31 {
                    errors.append("Day of month must be 1-31")
                }
            }
            if task.recurrence.interval < 1 {
                errors.append("Interval must be at least 1")
            }
        default:
            break
        }

        return Result(isValid: errors.isEmpty, errors: errors)
    }

    public static func validateForCreate(_ task: Task) -> Result {
        var result = validate(task)
        if !result.isValid { return result }

        // Additional create-time checks
        if task.recurrence.type == .weeklyGoal {
            // Weekly goals are always valid
        }
        return result
    }

    public static func validateForUpdate(_ task: Task, existing: Task) -> Result {
        var result = validate(task)
        if !result.isValid { return result }

        // Don't allow changing recurrence type in a way that loses data
        // (Server handles this, but we can warn)
        return result
    }
}