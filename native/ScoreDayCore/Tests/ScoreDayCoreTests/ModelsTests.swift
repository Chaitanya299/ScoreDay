import Testing
import Foundation
@testable import ScoreDayCore

@Suite("LocalDate Tests")
struct LocalDateTests {

    @Test("Parse valid ISO date")
    func parseValidDate() {
        let date = LocalDate.parse("2026-09-15")
        #expect(date != nil)
        #expect(date?.year == 2026)
        #expect(date?.month == 9)
        #expect(date?.day == 15)
    }

    @Test("Parse invalid date returns nil")
    func parseInvalidDate() {
        let date = LocalDate.parse("not-a-date")
        #expect(date == nil)
    }

    @Test("ISO string round-trip")
    func isoStringRoundTrip() {
        let original = LocalDate(year: 2026, month: 9, day: 15)
        let parsed = LocalDate.parse(original.isoString)
        #expect(parsed == original)
    }

    @Test("Adding days")
    func addingDays() {
        let date = LocalDate(year: 2026, month: 9, day: 15)
        let next = date.adding(days: 1)
        #expect(next?.day == 16)
        #expect(next?.month == 9)
        #expect(next?.year == 2026)
    }

    @Test("Month boundary")
    func monthBoundary() {
        let date = LocalDate(year: 2026, month: 9, day: 30)
        let next = date.adding(days: 1)
        #expect(next?.day == 1)
        #expect(next?.month == 10)
    }

    @Test("Year boundary")
    func yearBoundary() {
        let date = LocalDate(year: 2026, month: 12, day: 31)
        let next = date.adding(days: 1)
        #expect(next?.day == 1)
        #expect(next?.month == 1)
        #expect(next?.year == 2027)
    }

    @Test("Week start (Monday)")
    func weekStart() {
        // 2026-09-15 is a Tuesday
        let date = LocalDate(year: 2026, month: 9, day: 15)
        let weekStart = date.startOfWeek()
        // Monday 2026-09-14
        #expect(weekStart.day == 14)
        #expect(weekStart.month == 9)
    }

    @Test("Week end (Sunday)")
    func weekEnd() {
        let date = LocalDate(year: 2026, month: 9, day: 15)
        let weekEnd = date.endOfWeek()
        // Sunday 2026-09-20
        #expect(weekEnd.day == 20)
        #expect(weekEnd.month == 9)
    }

    @Test("Comparable")
    func comparable() {
        let d1 = LocalDate(year: 2026, month: 9, day: 1)
        let d2 = LocalDate(year: 2026, month: 9, day: 15)
        #expect(d1 < d2)
        #expect(d2 > d1)
        #expect(d1 <= d2)
        #expect(d2 >= d1)
    }

    @Test("Weekday zero-based (0=Sun)")
    func weekdayZeroBased() {
        // 2026-09-13 is Sunday
        let sunday = LocalDate(year: 2026, month: 9, day: 13)
        #expect(sunday.weekdayZeroBased == 0)

        // 2026-09-14 is Monday
        let monday = LocalDate(year: 2026, month: 9, day: 14)
        #expect(monday.weekdayZeroBased == 1)
    }
}

@Suite("Week Tests")
struct WeekTests {
    @Test("Week creation")
    func weekCreation() {
        let start = LocalDate(year: 2026, month: 9, day: 14) // Monday
        let week = Week(start: start)
        #expect(week.start == start)
        #expect(week.end.day == 20) // Sunday
    }

    @Test("Week days")
    func weekDays() {
        let start = LocalDate(year: 2026, month: 9, day: 14)
        let week = Week(start: start)
        let days = week.days
        #expect(days.count == 7)
        #expect(days.first == start)
        #expect(days.last?.day == 20)
    }

    @Test("Next/Previous week")
    func nextPreviousWeek() {
        let start = LocalDate(year: 2026, month: 9, day: 14)
        let week = Week(start: start)
        let next = week.next()
        let prev = week.previous()

        #expect(next.start.day == 21)  // Next Monday
        #expect(prev.start.day == 7)   // Previous Monday
    }
}

@Suite("Month Tests")
struct MonthTests {
    @Test("Month creation")
    func monthCreation() {
        let month = Month(year: 2026, month: 9)
        #expect(month.start.day == 1)
        #expect(month.end.day == 30)  // September has 30 days
    }

    @Test("February leap year")
    func februaryLeapYear() {
        let month = Month(year: 2024, month: 2)
        #expect(month.end.day == 29)
    }

    @Test("February non-leap year")
    func februaryNonLeapYear() {
        let month = Month(year: 2023, month: 2)
        #expect(month.end.day == 28)
    }

    @Test("Next/Previous month")
    func nextPreviousMonth() {
        let month = Month(year: 2026, month: 9)
        let next = month.next()
        let prev = month.previous()

        #expect(next.month == 10)
        #expect(prev.month == 8)

        let dec = Month(year: 2026, month: 12)
        let nextDec = dec.next()
        #expect(nextDec.year == 2027)
        #expect(nextDec.month == 1)
    }

    @Test("Month days")
    func monthDays() {
        let month = Month(year: 2026, month: 9)
        let days = month.days
        #expect(days.count == 30)
        #expect(days.first?.day == 1)
        #expect(days.last?.day == 30)
    }

    @Test("Calendar grid")
    func calendarGrid() {
        let month = Month(year: 2026, month: 9) // Sep 1 is Tuesday
        let grid = month.calendarGrid()
        #expect(grid.count == 6)  // 6 weeks
        #expect(grid.allSatisfy { $0.count == 7 })  // 7 days per week

        // First week should have leading nils (Sun, Mon)
        let firstWeek = grid[0]
        let firstRealDay = firstWeek.compactMap { $0 }.first
        #expect(firstRealDay?.day == 1)
    }
}

@Suite("Recurrence Tests")
struct RecurrenceTests {
    @Test("Daily recurrence")
    func dailyRecurrence() {
        let recurrence = Recurrence(type: .daily, interval: 1)
        let date = LocalDate(year: 2026, month: 9, day: 15)
        #expect(recurrence.isActive)
        #expect(!recurrence.isExpired)
    }

    @Test("Weekly recurrence selected days")
    func weeklyRecurrence() {
        let recurrence = Recurrence(type: .weekly, interval: 1, selectedWeekdays: [1, 3, 5]) // Mon, Wed, Fri
        let monday = LocalDate(year: 2026, month: 9, day: 14)
        let tuesday = LocalDate(year: 2026, month: 9, day: 15)

        #expect(recurrence.selectedWeekdays.contains(monday.weekdayZeroBased))
        #expect(!recurrence.selectedWeekdays.contains(tuesday.weekdayZeroBased))
    }

    @Test("Weekly goal is due any day")
    func weeklyGoal() {
        let recurrence = Recurrence(type: .weeklyGoal)
        let date = LocalDate(year: 2026, month: 9, day: 15)
        #expect(recurrence.isActive)
    }
}

@Suite("Task Status Tests")
struct TaskStatusTests {
    @Test("Daily task due today")
    func dailyDue() {
        let task = Task(
            title: "Daily Task",
            recurrence: Recurrence(type: .daily)
        )
        #expect(task.statusForToday == .due)
    }

    @Test("Weekly task due on selected day")
    func weeklyDue() {
        let today = LocalDate.today()
        let weekday = today.weekdayZeroBased
        let task = Task(
            title: "Weekly Task",
            recurrence: Recurrence(type: .weekly, selectedWeekdays: [weekday])
        )
        #expect(task.statusForToday == .due)
    }

    @Test("Weekly task not due on non-selected day")
    func weeklyNotDue() {
        let today = LocalDate.today()
        let weekday = today.weekdayZeroBased
        let otherDay = (weekday + 1) % 7
        let task = Task(
            title: "Weekly Task",
            recurrence: Recurrence(type: .weekly, selectedWeekdays: [otherDay])
        )
        #expect(task.statusForToday == .notDue)
    }

    @Test("Weekly goal always due")
    func weeklyGoalDue() {
        let task = Task(
            title: "Weekly Goal",
            recurrence: Recurrence(type: .weeklyGoal)
        )
        #expect(task.statusForToday == .due)
    }

    @Test("One-time task upcoming")
    func oneTimeUpcoming() {
        let tomorrow = LocalDate.today().adding(days: 1)!
        let task = Task(
            title: "One Time",
            recurrence: Recurrence(type: .none, dueDate: tomorrow)
        )
        #expect(task.statusForToday == .upcoming)
    }

    @Test("One-time task due today")
    func oneTimeDue() {
        let today = LocalDate.today()
        let task = Task(
            title: "One Time",
            recurrence: Recurrence(type: .none, dueDate: today)
        )
        #expect(task.statusForToday == .due)
    }

    @Test("One-time task missed")
    func oneTimeMissed() {
        let yesterday = LocalDate.today().adding(days: -1)!
        let task = Task(
            title: "One Time",
            recurrence: Recurrence(type: .none, dueDate: yesterday)
        )
        #expect(task.statusForToday == .missed)
    }

    @Test("Inactive task")
    func inactiveTask() {
        let task = Task(
            title: "Inactive",
            active: false
        )
        #expect(task.statusForToday == .missed)
    }
}

@Suite("TaskValidation Tests")
struct TaskValidationTests {
    @Test("Valid daily task")
    func validDaily() {
        let task = Task(title: "Valid Daily", recurrence: Recurrence(type: .daily))
        let result = TaskValidation.validate(task)
        #expect(result.isValid)
    }

    @Test("Invalid empty title")
    func emptyTitle() {
        let task = Task(title: "", recurrence: Recurrence(type: .daily))
        let result = TaskValidation.validate(task)
        #expect(!result.isValid)
        #expect(result.errors.contains("Title is required"))
    }

    @Test("Invalid points")
    func invalidPoints() {
        var task = Task(title: "Test", recurrence: Recurrence(type: .daily))
        task.points = 15  // init clamps, so bypass it
        let result = TaskValidation.validate(task)
        #expect(!result.isValid)
        #expect(result.errors.contains("Points must be 1-10"))
    }

    @Test("Weekly needs days")
    func weeklyNeedsDays() {
        let task = Task(title: "Weekly", recurrence: Recurrence(type: .weekly))
        let result = TaskValidation.validate(task)
        #expect(!result.isValid)
        #expect(result.errors.contains("Select at least one day for weekly recurrence"))
    }

    @Test("One-time needs due date")
    func oneTimeNeedsDueDate() {
        let task = Task(title: "One Time", recurrence: Recurrence(type: .none))
        let result = TaskValidation.validate(task)
        #expect(!result.isValid)
        #expect(result.errors.contains("Due date is required for one-time tasks"))
    }

    @Test("One-time due date not in past")
    func oneTimeNotPast() {
        let yesterday = LocalDate.today().adding(days: -1)!
        let task = Task(title: "One Time", recurrence: Recurrence(type: .none, dueDate: yesterday))
        let result = TaskValidation.validate(task)
        #expect(!result.isValid)
        #expect(result.errors.contains("Due date cannot be in the past"))
    }
}
// Payload shapes copied from the Next.js API (see app/api/*). Guards the Swift/server contract.
@Suite("API Contract Tests")
struct APIContractTests {
    private func decode<T: Decodable>(_ type: T.Type, _ json: String) throws -> T {
        try JSONDecoder().decode(T.self, from: Data(json.utf8))
    }

    @Test("GET /api/tasks row")
    func taskRow() throws {
        let task = try decode(Task.self, """
        {"id":"t1","title":"Gym","description":null,"category":"Fitness","points":5,
         "recurrenceType":"WEEKLY","interval":1,"unit":null,"selectedWeekdays":"1,3,5",
         "dayOfMonth":null,"dueDate":null,"startDate":"2026-09-01","endDate":null,"active":true,
         "createdAt":"2026-09-09T06:56:12.470Z","updatedAt":"2026-09-09T06:56:43.170Z"}
        """)
        #expect(task.recurrence.type == .weekly)
        #expect(task.recurrence.selectedWeekdays == [1, 3, 5])
        #expect(task.recurrence.startDate == LocalDate(year: 2026, month: 9, day: 1))
        #expect(task.serverStatus == nil)
    }

    @Test("GET /api/dashboard task uses server status")
    func dashboardTask() throws {
        let task = try decode(Task.self, """
        {"id":"t1","title":"Gym","category":"Fitness","points":5,"recurrenceType":"WEEKLY_GOAL",
         "daysOfWeek":"1,2,3","dueDate":null,"active":true,"status":"SATISFIED","isCompleted":true}
        """)
        #expect(task.statusForToday == .satisfied)
        #expect(task.recurrence.selectedWeekdays == [1, 2, 3])
    }

    @Test("GET /api/progress/week bundle")
    func weekBundle() throws {
        let b = try decode(WeekProgressBundle.self, """
        {"weeklyProgress":{"weekStart":"2026-09-14","weekEnd":"2026-09-20","earned":10,"max":20,"percentage":50,
          "dailyBreakdown":[{"date":"2026-09-14","earned":10,"max":20,"percentage":50,"hasScheduledTasks":true}]},
         "streaks":{"currentStreak":1,"bestStreak":3,"consistencyRate":50,"successfulDays":1,"scheduledDays":2},
         "taskPerformance":[],"categoryPerformance":[],
         "missed":[{"taskId":"t1","taskTitle":"Walk","category":null,"occurrenceDate":"2026-09-17","points":5}]}
        """)
        #expect(b.weeklyProgress.weekStart == LocalDate(year: 2026, month: 9, day: 14))
        #expect(b.missed.first?.occurrenceKey == "2026-09-17")
    }

    @Test("GET /api/progress/month bundle")
    func monthBundle() throws {
        let b = try decode(MonthProgressBundle.self, """
        {"monthlyProgress":{"month":"2026-09","earned":1,"max":2,"percentage":50,"averageScore":50,
          "bestDay":{"date":"2026-09-11","percentage":100},"totalPoints":1,"completionRate":50,"dailyScores":[]},
         "trend":{"current":{"averageScore":50,"bestDay":null,"totalPoints":1,"completionRate":50},"previous":null,
          "averageScoreChange":null,"completionRateChange":null,"pointsChange":null},
         "streaks":null,"taskPerformance":[],"categoryPerformance":[],"missed":[]}
        """)
        #expect(b.monthlyProgress.month == Month(year: 2026, month: 9))
    }

    @Test("GET /api/progress/day detail")
    func dayDetail() throws {
        let d = try decode(DayDetail.self, """
        {"date":"2026-09-17","percentage":0,"earned":0,"max":5,"completedTasks":[],
         "missedTasks":[{"taskId":"t1","title":"Walk","category":"Fitness","points":5}]}
        """)
        #expect(d.missedTasks.count == 1)
    }
}

// Regression: undo must send taskId/dateStr in the JSON BODY (the DELETE handler
// reads the body). A previous version sent query params only → server 500.
final class CapturingURLProtocol: URLProtocol {
    nonisolated(unsafe) static var lastRequest: URLRequest?
    nonisolated(unsafe) static var lastBody: Data?
    override class func canInit(with request: URLRequest) -> Bool { true }
    override class func canonicalRequest(for request: URLRequest) -> URLRequest { request }
    override func startLoading() {
        CapturingURLProtocol.lastRequest = request
        CapturingURLProtocol.lastBody = request.httpBody
            ?? request.httpBodyStream.map { s -> Data in
                s.open(); defer { s.close() }
                var data = Data(); var buf = [UInt8](repeating: 0, count: 4096)
                while s.hasBytesAvailable { let n = s.read(&buf, maxLength: buf.count); if n <= 0 { break }; data.append(buf, count: n) }
                return data
            }
        let resp = HTTPURLResponse(url: request.url!, statusCode: 200, httpVersion: nil, headerFields: nil)!
        client?.urlProtocol(self, didReceive: resp, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: Data(#"{"success":true,"undone":1}"#.utf8))
        client?.urlProtocolDidFinishLoading(self)
    }
    override func stopLoading() {}
}

@Suite("Completion wire format")
struct CompletionWireTests {
    @Test("undo sends taskId/dateStr in the body, not the query")
    func undoUsesBody() async throws {
        let config = URLSessionConfiguration.ephemeral
        config.protocolClasses = [CapturingURLProtocol.self]
        let client = APIClient(baseURL: URL(string: "http://localhost:3000")!, session: URLSession(configuration: config))
        _ = try await CompletionService(client: client).undo(taskId: "abc", date: LocalDate(year: 2026, month: 9, day: 19))

        let req = try #require(CapturingURLProtocol.lastRequest)
        #expect(req.httpMethod == "DELETE")
        #expect(req.url?.query == nil)  // no query params
        let body = try #require(CapturingURLProtocol.lastBody)
        let json = try JSONSerialization.jsonObject(with: body) as? [String: Any]
        #expect(json?["taskId"] as? String == "abc")
        #expect(json?["dateStr"] as? String == "2026-09-19")
    }
}
