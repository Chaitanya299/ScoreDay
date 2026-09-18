import Foundation

public actor TaskService {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func list() async throws -> [Task] {
        try await client.get("/api/tasks")
    }

    public func create(_ task: Task) async throws -> Task {
        let request = CreateTaskRequest(from: task)
        return try await client.post("/api/tasks", body: request)
    }

    public func update(_ task: Task) async throws -> Task {
        let request = UpdateTaskRequest(from: task)
        return try await client.put("/api/tasks/\(task.id)", body: request)
    }

    public func delete(_ id: String) async throws {
        _ = try await client.delete("/api/tasks/\(id)", query: [:]) as EmptyResponse
    }
}

private struct CreateTaskRequest: Encodable {
    let title: String
    let description: String?
    let category: String?
    let points: Int
    let recurrenceType: RecurrenceType
    let interval: Int
    let unit: RecurrenceUnit?
    let selectedWeekdays: String?
    let dayOfMonth: Int?
    let dueDate: String?
    let startDate: String?
    let endDate: String?
    let active: Bool

    init(from task: Task) {
        self.title = task.title
        self.description = task.description
        self.category = task.category
        self.points = task.points
        self.recurrenceType = task.recurrence.type
        self.interval = task.recurrence.interval
        self.unit = task.recurrence.unit
        self.selectedWeekdays = task.recurrence.selectedWeekdays.isEmpty ? nil :
            task.recurrence.selectedWeekdays.map(String.init).joined(separator: ",")
        self.dayOfMonth = task.recurrence.dayOfMonth
        self.dueDate = task.recurrence.dueDate?.isoString
        self.startDate = task.recurrence.startDate?.isoString
        self.endDate = task.recurrence.endDate?.isoString
        self.active = task.active
    }
}

private struct UpdateTaskRequest: Encodable {
    let title: String?
    let description: String?
    let category: String?
    let points: Int?
    let recurrenceType: RecurrenceType?
    let interval: Int?
    let unit: RecurrenceUnit?
    let selectedWeekdays: String?
    let dayOfMonth: Int?
    let dueDate: String?
    let startDate: String?
    let endDate: String?
    let active: Bool?

    init(from task: Task) {
        self.title = task.title
        self.description = task.description
        self.category = task.category
        self.points = task.points
        self.recurrenceType = task.recurrence.type
        self.interval = task.recurrence.interval
        self.unit = task.recurrence.unit
        self.selectedWeekdays = task.recurrence.selectedWeekdays.isEmpty ? nil :
            task.recurrence.selectedWeekdays.map(String.init).joined(separator: ",")
        self.dayOfMonth = task.recurrence.dayOfMonth
        self.dueDate = task.recurrence.dueDate?.isoString
        self.startDate = task.recurrence.startDate?.isoString
        self.endDate = task.recurrence.endDate?.isoString
        self.active = task.active
    }
}

private struct EmptyResponse: Decodable {}