import Foundation

public enum APIError: Error, LocalizedError, Sendable {
    case invalidURL
    case invalidResponse
    case httpError(statusCode: Int, data: Data?)
    case decodingError(Error)
    case networkError(Error)
    case notFound
    case unauthorized
    case serverError

    public var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid API URL"
        case .invalidResponse:
            return "Invalid response from server"
        case .httpError(let status, let data):
            if let data = data, let msg = String(data: data, encoding: .utf8) {
                return "HTTP \(status): \(msg)"
            }
            return "HTTP \(status)"
        case .decodingError(let err):
            return "Failed to decode response: \(err.localizedDescription)"
        case .networkError(let err):
            return "Network error: \(err.localizedDescription)"
        case .notFound:
            return "Resource not found"
        case .unauthorized:
            return "Unauthorized"
        case .serverError:
            return "Server error"
        }
    }
}

public actor APIClient {
    public let baseURL: URL
    private let session: URLSession
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    public init(baseURL: URL, session: URLSession = .shared) {
        self.baseURL = baseURL
        self.session = session
        self.decoder = JSONDecoder()
        self.decoder.dateDecodingStrategy = .iso8601
        self.encoder = JSONEncoder()
        self.encoder.dateEncodingStrategy = .iso8601
    }

    public func get<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        return try await request(components.url!, method: "GET", body: nil as String?)
    }

    public func post<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        return try await request(baseURL.appendingPathComponent(path), method: "POST", body: body)
    }

    public func put<T: Decodable, B: Encodable>(_ path: String, body: B) async throws -> T {
        return try await request(baseURL.appendingPathComponent(path), method: "PUT", body: body)
    }

    public func delete<T: Decodable>(_ path: String, query: [String: String] = [:]) async throws -> T {
        var components = URLComponents(url: baseURL.appendingPathComponent(path), resolvingAgainstBaseURL: false)!
        if !query.isEmpty {
            components.queryItems = query.map { URLQueryItem(name: $0.key, value: $0.value) }
        }
        return try await request(components.url!, method: "DELETE", body: nil as String?)
    }

    private func request<T: Decodable, B: Encodable>(_ url: URL, method: String, body: B?) async throws -> T {
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = body {
            request.httpBody = try encoder.encode(body)
        }

        do {
            let (data, response) = try await session.data(for: request)
            guard let httpResponse = response as? HTTPURLResponse else {
                throw APIError.invalidResponse
            }

            switch httpResponse.statusCode {
            case 200..<300:
                if T.self == EmptyResponse.self {
                    return EmptyResponse() as! T
                }
                return try decoder.decode(T.self, from: data)
            case 404:
                throw APIError.notFound
            case 401:
                throw APIError.unauthorized
            case 500..<600:
                throw APIError.serverError
            default:
                throw APIError.httpError(statusCode: httpResponse.statusCode, data: data)
            }
        } catch let error as APIError {
            throw error
        } catch {
            throw APIError.networkError(error)
        }
    }
}

private struct EmptyResponse: Decodable {}