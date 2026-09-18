import SwiftUI
import ScoreDayCore

struct TaskFormView: View {
    @ObservedObject var viewModel: TasksViewModel
    @Environment(\.dismiss) private var dismiss
    let editingTask: Task?

    @State private var title = ""
    @State private var description = ""
    @State private var category = ""
    @State private var points = 10
    @State private var recurrenceType: RecurrenceType = .daily
    @State private var selectedWeekdays: Set<Int> = []
    @State private var customInterval = 1
    @State private var customUnit: RecurrenceUnit = .day
    @State private var customDayOfMonth = 1
    @State private var dueDate = LocalDate.today()
    @State private var startDate = LocalDate.today()
    @State private var endDate: LocalDate? = nil
    @State private var active = true
    @State private var showValidationErrors = false

    private let predefinedCategories = Category.predefined.map { $0.name }

    var isEditing: Bool { editingTask != nil }

    var body: some View {
        NavigationStack {
            Form {
                // Basic Info
                Section("Basic Info") {
                    TextField("Title *", text: $title)
                    TextField("Description", text: $description, axis: .vertical)
                        .lineLimit(3...6)

                    // Category picker with custom option
                    Picker("Category", selection: $category) {
                        Text("None").tag("")
                        ForEach(predefinedCategories, id: \.self) { cat in
                            Text(cat).tag(cat)
                        }
                        Text("Other…").tag("__custom__")
                    }
                    .onChange(of: category) { _, newValue in
                        if newValue == "__custom__" {
                            category = ""
                        }
                    }

                    if category == "" && category != "__custom__" {
                        TextField("Custom category", text: $category)
                    }

                    Stepper("Points: \(points)", value: $points, in: 1...10)
                }

                // Recurrence
                Section("When?") {
                    Picker("Recurrence", selection: $recurrenceType) {
                        ForEach(RecurrenceType.allCases, id: \.self) { type in
                            Text(type.displayName).tag(type)
                        }
                    }
                    .pickerStyle(.segmented)

                    switch recurrenceType {
                    case .daily:
                        Text("Every day")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                    case .weekly:
                        WeekdaySelector(selectedDays: $selectedWeekdays)

                    case .weeklyGoal:
                        Text("Complete any day this week. One completion covers the whole week.")
                            .font(.caption)
                            .foregroundStyle(.secondary)

                    case .none:
                        DatePicker("Due Date *", selection: Binding(
                            get: { dueDate.date ?? Date() },
                            set: { dueDate = LocalDate($0) }
                        ), displayedComponents: .date)
                        .environment(\.locale, Locale(identifier: "en_US"))

                    case .custom:
                        VStack(alignment: .leading, spacing: 12) {
                            HStack {
                                Text("Every")
                                Stepper("\(customInterval)", value: $customInterval, in: 1...99)
                                Picker("Unit", selection: $customUnit) {
                                    ForEach(RecurrenceUnit.allCases, id: \.self) { unit in
                                        Text(unit.displayName).tag(unit)
                                    }
                                }
                                .pickerStyle(.menu)
                            }

                            if customUnit == .week {
                                WeekdaySelector(selectedDays: $selectedWeekdays)
                            } else if customUnit == .month {
                                Stepper("Day of month: \(customDayOfMonth)", value: $customDayOfMonth, in: 1...31)
                            }

                            DatePicker("Start Date", selection: Binding(
                                get: { startDate.date ?? Date() },
                                set: { startDate = LocalDate($0) }
                            ), displayedComponents: .date)

                            Toggle("Set End Date", isOn: Binding(
                                get: { endDate != nil },
                                set: { newValue in
                                    if newValue { endDate = startDate.adding(months: 1) }
                                    else { endDate = nil }
                                }
                            ))
                            if let end = endDate {
                                DatePicker("End Date", selection: Binding(
                                    get: { end.date ?? Date() },
                                    set: { endDate = LocalDate($0) }
                                ), displayedComponents: .date)
                            }
                        }
                    }
                }

                // Active toggle
                Section {
                    Toggle("Active", isOn: $active)
                }

                // Save/Delete
                Section {
                    HStack {
                        Button(isEditing ? "Update Task" : "Create Task") {
                            saveTask()
                        }
                        .disabled(title.trimmingCharacters(in: .whitespaces).isEmpty)
                        .frame(maxWidth: .infinity)

                        if isEditing {
                            Button("Delete", role: .destructive) {
                                deleteTask()
                            }
                        }
                    }
                }
            }
            .navigationTitle(isEditing ? "Edit Task" : "New Task")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancel") { dismiss() }
                }
            }
        }
    }

    private func saveTask() {
        var recurrence = Recurrence(type: recurrenceType)

        switch recurrenceType {
        case .daily:
            recurrence = Recurrence(type: .daily, startDate: startDate)
        case .weekly:
            recurrence = Recurrence(type: .weekly, selectedWeekdays: Array(selectedWeekdays).sorted(), startDate: startDate)
        case .weeklyGoal:
            recurrence = Recurrence(type: .weeklyGoal, startDate: startDate)
        case .none:
            recurrence = Recurrence(type: .none, dueDate: dueDate, startDate: startDate)
        case .custom:
            recurrence = Recurrence(
                type: .custom,
                interval: customInterval,
                unit: customUnit,
                selectedWeekdays: customUnit == .week ? Array(selectedWeekdays).sorted() : [],
                dayOfMonth: customUnit == .month ? customDayOfMonth : nil,
                startDate: startDate,
                endDate: endDate
            )
        }

        let task = Task(
            id: editingTask?.id ?? UUID().uuidString,
            title: title.trimmingCharacters(in: .whitespacesAndNewlines),
            description: description.isEmpty ? nil : description,
            category: category.isEmpty ? nil : category,
            points: points,
            recurrence: recurrence,
            active: active,
            createdAt: editingTask?.createdAt ?? Date(),
            updatedAt: Date()
        )

        if isEditing {
            Task { await viewModel.updateTask(task) }
        } else {
            Task { await viewModel.createTask(task) }
        }
        dismiss()
    }

    private func deleteTask() {
        guard let task = editingTask else { return }
        Task { await viewModel.deleteTask(task) }
        dismiss()
    }
}

struct WeekdaySelector: View {
    @Binding var selectedDays: Set<Int>

    private let weekdays = [
        (0, "S"), (1, "M"), (2, "T"), (3, "W"),
        (4, "T"), (5, "F"), (6, "S")
    ]

    var body: some View {
        HStack(spacing: 8) {
            ForEach(weekdays, id: \.0) { index, label in
                let isSelected = selectedDays.contains(index)
                Button(action: {
                    if isSelected {
                        selectedDays.remove(index)
                    } else {
                        selectedDays.insert(index)
                    }
                }) {
                    Text(label)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .frame(width: 36, height: 36)
                        .background(
                            Circle()
                                .fill(selectedDays.contains(index) ? Color.scoredayAccent : Color.scoredaySurface)
                        )
                        .overlay(
                            Circle()
                                .stroke(selectedDays.contains(index) ? Color.scoredayAccent : Color.scoredayBorder, lineWidth: 2)
                        )
                        .foregroundStyle(selectedDays.contains(index) ? .white : .primary)
                }
                .buttonStyle(.plain)
            }
        }
    }
}