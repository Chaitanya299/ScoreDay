import Foundation
import GRDB

// MARK: - Database Schema

struct LocalCache {
    static func createTables(_ db: Database) throws {
        try db.create(table: "taskCache", ifNotExists: true) { t in
            t.column("id", .text).primaryKey()
            t.column("title", .text).notNull()
            t.column("description", .text)
            t.column("category", .text)
            t.column("points", .integer).notNull()
            t.column("recurrenceJSON", .text).notNull()
            t.column("active", .boolean).notNull().defaults(to: true)
            t.column("createdAt", .datetime).notNull()
            t.column("updatedAt", .datetime).notNull()
            t.column("serverUpdatedAt", .datetime)
        }

        try db.create(table: "completionCache", ifNotExists: true) { t in
            t.column("id", .text).primaryKey()
            t.column("taskId", .text).notNull().references("taskCache", onDelete: .cascade)
            t.column("occurrenceKey", .text).notNull()
            t.column("completedOn", .text).notNull()
            t.column("pointsEarned", .integer).notNull()
            t.column("completedAt", .datetime).notNull()
            t.column("serverCreatedAt", .datetime)
            t.uniqueKey(["taskId", "occurrenceKey"])
        }
    }
}

// MARK: - Cache Models

struct TaskCache: Codable, FetchableRecord, PersistableRecord {
    var id: String
    var title: String
    var description: String?
    var category: String?
    var points: Int
    var recurrenceJSON: String
    var active: Bool
    var createdAt: Date
    var updatedAt: Date
    var serverUpdatedAt: Date?

    static let databaseTableName = "taskCache"

    func toTask() throws -> Task {
        let recurrence = try JSONDecoder().decode(Recurrence.self, from: Data(recurrenceJSON.utf8))
        return Task(
            id: id,
            title: title,
            description: description,
            category: category,
            points: points,
            recurrence: recurrence,
            active: active,
            createdAt: createdAt,
            updatedAt: updatedAt
        )
    }

    static func from(_ task: Task) throws -> TaskCache {
        let recurrenceData = try JSONEncoder().encode(task.recurrence)
        return TaskCache(
            id: task.id,
            title: task.title,
            description: task.description,
            category: task.category,
            points: task.points,
            recurrenceJSON: String(data: recurrenceData, encoding: .utf8)!,
            active: task.active,
            createdAt: task.createdAt,
            updatedAt: task.updatedAt,
            serverUpdatedAt: task.updatedAt
        )
    }
}

struct CompletionCache: Codable, FetchableRecord, PersistableRecord {
    var id: String
    var taskId: String
    var occurrenceKey: String
    var completedOn: String // LocalDate.isoString
    var pointsEarned: Int
    var completedAt: Date
    var serverCreatedAt: Date?

    static let databaseTableName = "completionCache"
}

// MARK: - Database Manager

actor DatabaseManager {
    let dbQueue: DatabaseQueue

    init(path: String) throws {
        self.dbQueue = try DatabaseQueue(path: path)
        try dbQueue.write { db in
            try LocalCache.createTables(db)
        }
    }

    // MARK: - Task Cache

    func cacheTasks(_ tasks: [Task]) async throws {
        try await dbQueue.write { db in
            for task in tasks {
                let cache = try TaskCache.from(task)
                try cache.save(db)
            }
        }
    }

    func getCachedTasks() async throws -> [Task] {
        try await dbQueue.read { db in
            let caches = try TaskCache.fetchAll(db)
            return try caches.map { try $0.toTask() }
        }
    }

    func getCachedTask(id: String) async throws -> Task? {
        try await dbQueue.read { db in
            guard let cache = try TaskCache.fetchOne(db, key: id) else { return nil }
            return try cache.toTask()
        }
    }

    func upsertTask(_ task: Task) async throws {
        try await dbQueue.write { db in
            let cache = try TaskCache.from(task)
            try cache.save(db)
        }
    }

    func deleteTaskFromCache(_ id: String) async throws {
        try await dbQueue.write { db in
            _ = try TaskCache.deleteOne(db, key: id)
        }
    }

    // MARK: - Completion Cache

    func cacheCompletions(_ completions: [TaskCompletion]) async throws {
        try await dbQueue.write { db in
            for completion in completions {
                let cache = CompletionCache(
                    id: completion.id,
                    taskId: completion.taskId,
                    occurrenceKey: completion.occurrenceKey,
                    completedOn: completion.completedOn.isoString,
                    pointsEarned: completion.pointsEarned,
                    completedAt: completion.completedAt,
                    serverCreatedAt: completion.completedAt
                )
                try cache.save(db)
            }
        }
    }

    func getCachedCompletions(for taskId: String) async throws -> [TaskCompletion] {
        try await dbQueue.read { db in
            let caches = try CompletionCache
                .filter(Column("taskId") == taskId)
                .fetchAll(db)
            return caches.compactMap { $0.toTaskCompletion() }
        }
    }

    func getCachedCompletion(taskId: String, occurrenceKey: String) async throws -> TaskCompletion? {
        try await dbQueue.read { db in
            let cache = try CompletionCache
                .filter(Column("taskId") == taskId && Column("occurrenceKey") == occurrenceKey)
                .fetchOne(db)
            return cache?.toTaskCompletion()
        }
    }

    func upsertCompletion(_ completion: TaskCompletion) async throws {
        try await dbQueue.write { db in
            let cache = CompletionCache(
                id: completion.id,
                taskId: completion.taskId,
                occurrenceKey: completion.occurrenceKey,
                completedOn: completion.completedOn.isoString,
                pointsEarned: completion.pointsEarned,
                completedAt: completion.completedAt,
                serverCreatedAt: completion.completedAt
            )
            try cache.save(db)
        }
    }

    func deleteCompletionFromCache(taskId: String, occurrenceKey: String) async throws {
        try await dbQueue.write { db in
            _ = try CompletionCache
                .filter(Column("taskId") == taskId && Column("occurrenceKey") == occurrenceKey)
                .deleteAll(db)
        }
    }
}

extension CompletionCache {
    func toTaskCompletion() -> TaskCompletion? {
        guard let date = LocalDate.parse(completedOn) else { return nil }
        return TaskCompletion(
            id: id,
            taskId: taskId,
            occurrenceKey: occurrenceKey,
            completedOn: date,
            pointsEarned: pointsEarned,
            completedAt: completedAt
        )
    }
}

// MARK: - Repository Protocols

protocol TaskRepository {
    func list() async throws -> [Task]
    func create(_ task: Task) async throws -> Task
    func update(_ task: Task) async throws -> Task
    func delete(_ id: String) async throws
}

protocol CompletionRepository {
    func complete(taskId: String, date: LocalDate) async throws -> TaskCompletion
    func undo(taskId: String, date: LocalDate) async throws
    func getCompletion(taskId: String, date: LocalDate) async throws -> TaskCompletion?
}

protocol ProgressRepository {
    func daily(date: LocalDate) async throws -> DailyProgress
    func weekly(weekStart: LocalDate) async throws -> WeekProgressBundle
    func monthly(month: Month) async throws -> MonthProgressBundle
    func dayDetail(date: LocalDate) async throws -> DayDetail
}

// MARK: - GRDB Repositories

struct GRDBTaskRepository: TaskRepository {
    let dbManager: DatabaseManager
    let apiClient: TaskService

    func list() async throws -> [Task] {
        try await dbManager.getCachedTasks()
    }

    func create(_ task: Task) async throws -> Task {
        let created = try await apiClient.create(task)
        try await dbManager.upsertTask(created)
        return created
    }

    func update(_ task: Task) async throws -> Task {
        let updated = try await apiClient.update(task)
        try await dbManager.upsertTask(updated)
        return updated
    }

    func delete(_ id: String) async throws {
        try await apiClient.delete(id)
        try await dbManager.deleteTaskFromCache(id)
    }
}

struct GRDBCompletionRepository: CompletionRepository {
    let dbManager: DatabaseManager
    let apiClient: CompletionService

    func complete(taskId: String, date: LocalDate) async throws -> TaskCompletion {
        let response = try await apiClient.complete(taskId: taskId, date: date)
        guard let c = response.completion else {
            throw URLError(.cannotParseResponse)
        }
        let completion = TaskCompletion(
            id: c.id,
            taskId: c.taskId,
            occurrenceKey: c.occurrenceDate,
            completedOn: LocalDate.parse(c.completedOn) ?? date,
            pointsEarned: c.pointsEarned
        )
        try await dbManager.upsertCompletion(completion)
        return completion
    }

    func undo(taskId: String, date: LocalDate) async throws {
        try await apiClient.undo(taskId: taskId, date: date)
        try await dbManager.deleteCompletionFromCache(taskId: taskId, occurrenceKey: date.isoString)
    }

    func getCompletion(taskId: String, date: LocalDate) async throws -> TaskCompletion? {
        try await dbManager.getCachedCompletion(taskId: taskId, occurrenceKey: date.isoString)
    }
}

struct GRDBProgressRepository: ProgressRepository {
    let dbManager: DatabaseManager
    let apiClient: ProgressService

    func daily(date: LocalDate) async throws -> DailyProgress {
        try await apiClient.daily(date: date)
    }

    func weekly(weekStart: LocalDate) async throws -> WeekProgressBundle {
        try await apiClient.weekly(weekStart: weekStart)
    }

    func monthly(month: Month) async throws -> MonthProgressBundle {
        try await apiClient.monthly(month: month)
    }

    func dayDetail(date: LocalDate) async throws -> DayDetail {
        try await apiClient.dayDetail(date: date)
    }
}