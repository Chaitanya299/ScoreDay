import SwiftUI

// MARK: - Color Extensions

extension Color {
    static let scoredayBackground = Color("Background", bundle: .module)
    static let scoredaySurface = Color("Surface", bundle: .module)
    static let scoredaySurfaceElevated = Color("SurfaceElevated", bundle: .module)
    static let scoredayBorder = Color("Border", bundle: .module)
    static let scoredayAccent = Color("Accent", bundle: .module)
    static let scoredayAccentHover = Color("AccentHover", bundle: .module)
    static let scoredayTextPrimary = Color("TextPrimary", bundle: .module)
    static let scoredayTextSecondary = Color("TextSecondary", bundle: .module)
    static let scoredaySuccess = Color("Success", bundle: .module)
    static let scoredayWarning = Color("Warning", bundle: .module)
    static let scoredayError = Color("Error", bundle: .module)
}

// Fallback colors for development (when asset catalog not available)
extension Color {
    static var scoredayBackgroundDev: Color {
        #if os(iOS)
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: 0x0B0E14) : UIColor(hex: 0xF8FAFC) })
        #else
        Color(nsColor: NSColor(hex: 0xF8FAFC))
        #endif
    }

    static var scoredaySurfaceDev: Color {
        #if os(iOS)
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: 0x11161E) : UIColor(hex: 0xFFFFFF) })
        #else
        Color(nsColor: NSColor(hex: 0xFFFFFF))
        #endif
    }

    static var scoredayBorderDev: Color {
        #if os(iOS)
        Color(UIColor { $0.userInterfaceStyle == .dark ? UIColor(hex: 0x1E293B) : UIColor(hex: 0xE2E8F0) })
        #else
        Color(nsColor: NSColor(hex: 0xE2E8F0))
        #endif
    }

    static let scoredayAccentDev = Color(hex: 0x6366F1)
    static let scoredayTextPrimaryDev = Color(hex: 0x0F172A)
    static let scoredayTextSecondaryDev = Color(hex: 0x64748B)
    static let scoredaySuccessDev = Color(hex: 0x10B981)
    static let scoredayWarningDev = Color(hex: 0xF59E0B)
    static let scoredayErrorDev = Color(hex: 0xEF4444)
}

// MARK: - UIColor/NSColor Extensions

#if os(iOS)
extension UIColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1.0) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255.0,
            green: CGFloat((hex >> 8) & 0xFF) / 255.0,
            blue: CGFloat(hex & 0xFF) / 255.0,
            alpha: alpha
        )
    }
}
#else
extension NSColor {
    convenience init(hex: UInt32, alpha: CGFloat = 1.0) {
        self.init(
            red: CGFloat((hex >> 16) & 0xFF) / 255.0,
            green: CGFloat((hex >> 8) & 0xFF) / 255.0,
            blue: CGFloat(hex & 0xFF) / 255.0,
            alpha: alpha
        )
    }
}
#endif

extension Color {
    init(hex: UInt32, opacity: Double = 1.0) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xFF) / 255.0,
            green: Double((hex >> 8) & 0xFF) / 255.0,
            blue: Double(hex & 0xFF) / 255.0,
            opacity: opacity
        )
    }
}

// MARK: - Button Styles

struct PrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.scoredayAccentDev)
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct SecondaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(Color.scoredayTextPrimaryDev)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color.scoredaySurfaceDev)
            .overlay(
                RoundedRectangle(cornerRadius: 8)
                    .stroke(Color.scoredayBorderDev, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

struct DestructiveButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.subheadline)
            .fontWeight(.semibold)
            .foregroundStyle(.white)
            .padding(.horizontal, 16)
            .padding(.vertical, 10)
            .background(Color(hex: 0xEF4444))
            .clipShape(RoundedRectangle(cornerRadius: 8))
            .scaleEffect(configuration.isPressed ? 0.98 : 1.0)
            .animation(.easeInOut(duration: 0.1), value: configuration.isPressed)
    }
}

// MARK: - DateFormatter Extensions

extension DateFormatter {
    static let shortDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        f.locale = Locale(identifier: "en_US")
        return f
    }()

    static let fullDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "EEEE, MMMM d, yyyy"
        f.locale = Locale(identifier: "en_US")
        return f
    }()

    static let shortWeekday: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "E"
        f.locale = Locale(identifier: "en_US")
        return f
    }()

    static let shortDate: DateFormatter = {
        let f = DateFormatter()
        f.dateFormat = "MMM d"
        f.locale = Locale(identifier: "en_US")
        return f
    }()
}

// MARK: - View Extensions

extension View {
    func scoredayCard() -> some View {
        self
            .padding(16)
            .background(Color.scoredaySurfaceDev)
            .overlay(
                RoundedRectangle(cornerRadius: 12)
                    .stroke(Color.scoredayBorderDev, lineWidth: 1)
            )
            .clipShape(RoundedRectangle(cornerRadius: 12))
    }

    func hideKeyboard() {
        #if os(iOS)
        UIApplication.shared.sendAction(#selector(UIResponder.resignFirstResponder), to: nil, from: nil, for: nil)
        #endif
    }
}