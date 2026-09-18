// ScoreDay-iOS - Tasks View with Create/Edit/Delete functionality
import SwiftUI
import ScoreDayCore

struct TasksView: View {
    @StateObject var viewModel: TasksViewModel

    var body: some View {
        NavigationStack {
            Group {
                if viewModel.tasks.isEmpty {
                    EmptyTasksView(onCreate: { viewModel.showCreateForm = true })
                } else {
                    List {
                        ForEach(viewModel.tasks) { task in
                            TaskRowView(
                                task: task,
                                onTap: { viewModel.startEditing($0) },
                                onDelete: { viewModel.confirmDelete($0) }
                            )
                            .swipeActions(edge: .trailing) {
                                Button(role: .destructive) {
                                    viewModel.confirmDelete($0)
                                } label: {
                                    Label("Delete", systemImage: "trash")
                                }
                            }
                        }
                    }
                    .listStyle(.insetGrouped)
            }
            .navigationTitle("Tasks")
            .toolbar {
                ToolbarItem(placement: .navigationBarTrailing) {
                    Button {
                        viewModel.showCreateForm = true
                    } label: {
                        Image(systemName: "plus")
                    }
                }
            }
            .sheet(isPresented: $viewModel.showCreateForm) {
                TaskFormView(viewModel: viewModel)
            }
            .sheet(item: $viewModel.editingTask) { task in
                TaskFormView(viewModel: viewModel, editingTask: task)
            }
            .alert("Delete Task?", isPresented: $viewModel.showDeleteConfirmation) {
                Button("Cancel", role: .cancel) { }
                Button("Delete", role: .destructive) {
                    Task { await viewModel.confirmDeletion() }
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
}

struct EmptyTasksView: View {
    let onCreate: () -> Void

    var body: some View {
        VStack(spacing: 20) {
            Image(systemName: "list.bullet.rectangle")
                .font(.system(size: 64))
                .foregroundStyle(.scoredayTextSecondary.opacity(0.5))

            VStack(spacing: 8) {
                Text("No Tasks Yet")
                    .font(.title2)
                    .fontWeight(.bold)
                    .foregroundStyle(.scoredayTextPrimary)

                Text("Create your first task to start building your scoreboard")
                    .font(.body)
                    .foregroundStyle(.scoredayTextSecondary)
                    .multilineTextAlignment(.center)
                    .padding(.horizontal, 40)
            }

            Button(action: onCreate) {
                Label("Create Task", systemImage: "plus")
                .font(.headline)
                .foregroundStyle(.white)
                .frame(maxWidth: .infinity)
                .padding(.vertical, 16)
                .background(Color.scoredayAccent)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .padding(.horizontal, 40)
            .padding(.top, 8)
        }
        .padding(40)
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .background(Color.scoredayBackground)
    }
}

struct TaskRowView: View {
    let task: Task
    let onTap: (Task) -> Void
    let onDelete: (Task) -> Void

    var body: some View {
        Button(action: { onTap(task) }) {
            HStack(spacing: 16) {
                // Completion indicator
                Circle()
                    .fill(task.statusForToday == .completed ? Color.scoredaySuccess : Color.scoredayBorder)
                    .frame(width: 12, height: 12)

                VStack(alignment: .leading, spacing: 4) {
                    Text(task.title)
                        .font(.body)
                        .fontWeight(.medium)
                        .foregroundStyle(.scoredayTextPrimary)
                        .lineLimit(1)

                    HSTACK(spacing: 8) {
                        if let category = task.category {
                            CategoryBadge(category: category)
                        }
                        Text(task.recurrence.displayString)
                            .font(.caption)
                            .foregroundStyle(.scoredayTextSecondary)
                    }
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 2) {
                    Text("+\(task.points)")
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .foregroundStyle(.scoredayAccent)

                    if let due = task.recurrence.dueDate {
                        Text(due.isoString)
                            .font(.caption2)
                            .foregroundStyle(.scoredayTextSecondary)
                    }
                }
            }
            .padding(.vertical, 4)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .swipeActions(edge: .trailing) {
            Button(role: .destructive) {
                // Handled by parent
            } label: {
                Label("Delete", systemImage: "trash")
            }
        }
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
            .background(Color.scoredayAccent.opacity(0.2))
            .foregroundStyle(.scoredayAccent)
            .clipShape(Capsule())
    }
}