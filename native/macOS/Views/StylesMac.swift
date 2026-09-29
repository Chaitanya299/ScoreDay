import SwiftUI

struct PrimaryButtonStyleMac: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(hex: 0x6366F1))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyleMac: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(Color(hex: 0x0F172A))
            .padding(.horizontal, 20)
            .padding(.vertical, 10)
            .background(Color(hex: 0xFFFFFF))
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color(hex: 0xE2E8F0), lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct DestructiveButtonStyleMac: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 8)
            .background(Color(hex: 0xEF4444))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}
// ponytail: fixed dark palette (app forces .dark); move to an asset catalog if light mode is added.
extension Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        self.init(.sRGB,
                  red: Double((hex >> 16) & 0xFF) / 255,
                  green: Double((hex >> 8) & 0xFF) / 255,
                  blue: Double(hex & 0xFF) / 255,
                  opacity: opacity)
    }

    static let scoredayBackgroundDev = Color(hex: 0x0B0E14)
    static let scoredaySurfaceDev = Color(hex: 0x11161E)
    static let scoredayBorderDev = Color(hex: 0x1E293B)
    static let scoredayAccentDev = Color(hex: 0x6366F1)
    static let scoredayTextPrimaryDev = Color(hex: 0xF1F5F9)
    static let scoredayTextSecondaryDev = Color(hex: 0x94A3B8)
    static let scoredaySuccessDev = Color(hex: 0x10B981)
    static let scoredayWarningDev = Color(hex: 0xF59E0B)
    static let scoredayErrorDev = Color(hex: 0xEF4444)
}

extension DateFormatter {
    private static func make(_ format: String) -> DateFormatter {
        let f = DateFormatter()
        f.dateFormat = format
        return f
    }

    static let shortDate = make("MMM d")
    static let fullDate = make("EEEE, MMMM d, yyyy")
    static let shortWeekday = make("E")
}
