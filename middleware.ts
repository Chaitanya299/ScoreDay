import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Shared-secret guard for the whole app (pages AND /api/*). Only enforced when
 * API_TOKEN is set — local dev (no token) stays open; the deployed server rejects
 * anyone without the secret. Pages like `/` and `/progress` render DB data on the
 * server, so guarding only /api/* would leave the data readable in a browser.
 *
 * Accepted credentials (single-user app, one secret):
 *   - `Authorization: Bearer <token>`  — the macOS app
 *   - HTTP Basic, password = <token>    — browsers (any username). The browser
 *     prompts once and re-sends it for the page's own /api calls.
 */
export function middleware(request: NextRequest) {
  const expected = process.env.API_TOKEN
  if (!expected) return NextResponse.next() // unset = open (local dev)

  const provided = secretFrom(request.headers.get('authorization') ?? '')
  if (provided && timingSafeEqual(provided, expected)) return NextResponse.next()

  if (request.nextUrl.pathname.startsWith('/api/')) {
    // No WWW-Authenticate here: API clients get plain JSON, not a browser prompt.
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return new NextResponse('Authentication required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="ScoreDay", charset="UTF-8"' },
  })
}

/** The secret from a Bearer token, or the password part of Basic credentials. */
function secretFrom(header: string): string {
  if (header.startsWith('Bearer ')) return header.slice(7)
  if (header.startsWith('Basic ')) {
    try {
      const decoded = atob(header.slice(6))
      const sep = decoded.indexOf(':')
      return sep === -1 ? '' : decoded.slice(sep + 1)
    } catch {
      return ''
    }
  }
  return ''
}

// Constant-time compare so a wrong token can't be guessed by response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = {
  // Everything except Next's static build assets (JS/CSS chunks hold no data).
  matcher: '/((?!_next/static|_next/image|favicon.ico).*)',
}
