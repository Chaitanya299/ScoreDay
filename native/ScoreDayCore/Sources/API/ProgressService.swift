import Foundation

public actor ProgressService {
    private let client: APIClient

    public init(client: APIClient) {
        self.client = client
    }

    // Daily progress
    public func daily(date: LocalDate = LocalDate.today()) async throws -> DailyProgress {
        try await client.get("/api/progress/day", query: ["date": date.isoString])
    }

    // Weekly progress
    public func weekly(weekStart: LocalDate) async throws -> WeekProgressBundle {
        try await client.get("/api/progress/week", query: ["weekStart": weekStart.isoString])
    }

    // Monthly progress
    public func monthly(month: Month) async throws -> MonthProgressBundle {
        try await client.get("/api/progress/month", query: ["month": month.isoString])
    }

    // Day detail
    public func dayDetail(date: LocalDate) async throws -> DayDetail {
        try await client.get("/api/progress/day", query: ["date": date.isoString])
    }
}