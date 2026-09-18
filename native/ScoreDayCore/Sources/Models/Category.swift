import Foundation

public struct Category: Codable, Identifiable, Equatable, Hashable, Sendable {
    public let id: String
    public let name: String
    public let color: String?

    public init(id: String = UUID().uuidString, name: String, color: String? = nil) {
        self.id = id
        self.name = name
        self.color = color
    }
}

public extension Category {
    static let predefined: [Category] = [
        Category(name: "Health"),
        Category(name: "Fitness"),
        Category(name: "Learning"),
        Category(name: "Work"),
        Category(name: "Personal"),
        Category(name: "Finance"),
        Category(name: "Relationships"),
        Category(name: "Creative"),
        Category(name: "Home"),
        Category(name: "Other")
    ]
}