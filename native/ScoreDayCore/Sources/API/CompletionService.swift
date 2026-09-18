import Foundation

public actor CompletionService {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    public func complete(taskId: String, date: LocalDate = LocalDate.today()) async throws -> CompletionResponse {
        let request = CompleteRequest(taskId: taskId, dateStr: date.isoString)
        return try await client.post("/api/completions", body: request)
    }

    public func undo(taskId: String, date: LocalDate = LocalDate.today()) async throws -> UndoResponse {
        let request = UndoRequest(taskId: taskId, dateStr: date.isoString)
        return try await client.delete("/api/completions", query: [
            "taskId": taskId,
            "dateStr": date.isoString
        ])
    }
}

private struct CompleteRequest: Encodable {
    let taskId: String
    let dateStr: String
}

private struct UndoRequest: Encodable {
    let taskId: String
    let dateStr: String
}

public struct CompletionResponse: Decodable, Sendable {
    public let success: Bool
    public let completion: TaskCompletionResponse?
    public let duplicate: Bool?
    public let offSchedule: Bool?
    public let message: String?
}

public struct TaskCompletionResponse: Decodable, Sendable {
    public let id: String
    public let taskId: String
    public let occurrenceDate: String
    public let completedOn: String
    public let pointsEarned: Int
}

public struct UndoResponse: Decodable, Sendable {
    public let success: Bool
    public let undone: Int?
    public let alreadyUndone: Bool?
    public let error: String?
}