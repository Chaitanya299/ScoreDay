import Foundation
import ScoreDayCore

@MainActor
final class TasksViewModel: ObservableObject {
    @Published var tasks: [Task] = []
    @Published var showCreateForm = false
    @Published var editingTask: Task? = nil
    @Published var showDeleteConfirmation = false
    @Published var taskToDelete: Task? = nil
    @Published var isLoading = false
    @Published var showError = false
    @Published var errorMessage: String? = nil
    @Published var loadFailed = false
    @Published var hasLoaded = false

    private let taskService: TaskService

    init(taskService: TaskService) {
        self.taskService = taskService
    }

    func load() async {
        isLoading = true
        defer { isLoading = false }
        do {
            let tasks = try await taskService.list()
            await MainActor.run {
                self.tasks = tasks.filter { $0.active }
                self.loadFailed = false
                self.hasLoaded = true
            }
        } catch {
            loadFailed = true
            showError(loadErrorMessage(error))
        }
    }

    func createTask(_ task: Task) async {
        do {
            let created = try await taskService.create(task)
            await MainActor.run {
                self.tasks.append(created)
            }
        } catch {
            showError("Failed to create task: \(error.localizedDescription)")
        }
    }

    func updateTask(_ task: Task) async {
        do {
            let updated = try await taskService.update(task)
            await MainActor.run {
                if let index = self.tasks.firstIndex(where: { $0.id == task.id }) {
                    self.tasks[index] = updated
                }
            }
        } catch {
            showError("Failed to update task: \(error.localizedDescription)")
        }
    }

    func deleteTask(_ task: Task) async {
        do {
            try await taskService.delete(task.id)
            await MainActor.run {
                self.tasks.removeAll { $0.id == task.id }
            }
        } catch {
            showError("Failed to delete task: \(error.localizedDescription)")
        }
    }

    func startEditing(_ task: Task) {
        editingTask = task
    }

    func confirmDelete(_ task: Task) {
        taskToDelete = task
    }

    func confirmDeletion() async {
        guard let task = taskToDelete else { return }
        await deleteTask(task)
        taskToDelete = nil
    }

    private func showError(_ message: String) {
        errorMessage = message
        showError = true
    }
}