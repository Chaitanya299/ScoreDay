// ScoreDay-macOS - Tasks View with Create/Edit/Delete functionality
import SwiftUI
import ScoreDayCore

struct TasksView: View {
    @StateObject var viewModel: TasksViewModel

    var body: some View {
        VStack(spacing: 0) {
            // Toolbar
            HStack {
                Text("Tasks")
                    .font(.title2)
                    .fontWeight(.bold)

                Spacer()

                Button(action: { viewModel.showCreateForm = true }) {
                    Label("Create Task", systemImage: "plus")
                }
                .buttonStyle(.borderedProminent)
            }
            .padding(20)

            Divider()

            // Task List
            Group {
                if viewModel.tasks.isEmpty {
                    EmptyTasksViewMac(onCreate: { viewModel.showCreateForm = true })
                } else {
                    Table(viewModel.tasks) {
                        TableColumn("") { task in
                            CompletionIndicator(task: task)
                        }
                        .width(40)

                        TableColumn("Task") { task in
                            VStack(alignment: .leading, spacing: 4) {
                                Text(task.title)
                                    .font(.body)
                                    .fontWeight(.medium)
                                if let category = task.category {
                                    CategoryBadge(category: category)
                                }
                            }
                        }

                        TableColumn("Category") { task in
                            if let category = task.category {
                                CategoryBadge(category: category)
                            }
                        }
                        .width(120)

                        TableColumn("Recurrence") { task in
                            Text(task.recurrence.displayString)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .width(180)

                        TableColumn("Points") { task in
                            Text("+\(task.points)")
                                .fontWeight(.semibold)
                                .foregroundStyle(Color(hex: 0x6366F1))
                        }
                        .width(80)

                        TableColumn("Actions") { task in
                            HStack(spacing: 8) {
                                Button("Edit") {
                                    viewModel.startEditing(task)
                                }
                                .buttonStyle(.borderless)

                                Button(role: .destructive) {
                                    viewModel.confirmDelete(task)
                                } label: {
                                    Image(systemName: "trash")
                                }
                                .buttonStyle(.borderless)
                            }
                        }
                        .width(120)
                    }
                }
            }
        }
        .navigationTitle("Tasks")
        .sheet(isPresented: $viewModel.showCreateForm) {
            TaskFormViewMac(viewModel: viewModel)
        }
        .sheet(item: $viewModel.editingTask) { task in
            TaskFormViewMac(viewModel: viewModel, editingTask: task)
        }
        .alert("Delete Task?", isPresented: $viewModel.showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                _Concurrency.Task { await viewModel.confirmDeletion() }
            }
        } message: {
            Text("This will remove the task from active lists. Historical completions are preserved for scoring accuracy.")
        }
        .alert("Error", isPresented: $viewModel.showError) {
            Button("OK") { }
        } message: {
            Text(viewModel.errorMessage ?? "")
        }
        .task {
            await viewModel.load()
        }
    }
}

struct EmptyTasksViewMac: View {
    let onCreate: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 64))
                .foregroundStyle(.secondary.opacity(0.5))

            VStack(spacing: 8) {
                Text("No Tasks Yet")
                    .font(.title2)
                    .fontWeight(.bold)

                Text("Create your first task to start building your scoreboard")
                    .font(.body)
                    .foregroundStyle(.secondary)
                    .multilineTextAlignment(.center)
            }

            Button(action: onCreate) {
                Label("Create Task", systemImage: "plus")
                    .font(.headline)
                    .foregroundStyle(.white)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 16)
                    .background(Color(hex: 0x6366F1))
                    .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .frame(width: 280)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

struct CompletionIndicator: View {
    let task: Task

    var body: some View {
        Circle()
            .fill(task.statusForToday == .completed ? Color(hex: 0x10B981) : Color(hex: 0xE2E8F0))
            .frame(width: 12, height: 12)
    }
}

struct CategoryBadge: View {
    let category: String

    var body: some View {
        Text(category)
            .font(.caption2)
            .fontWeight(.medium)
            .padding(.horizontal, 6)
            .padding(.vertical, 2)
            .background(Color(hex: 0x6366F1).opacity(0.2))
            .foregroundStyle(Color(hex: 0x6366F1))
            .clipShape(Capsule())
    }
}