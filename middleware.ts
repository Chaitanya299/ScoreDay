import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Shared-secret guard for /api/*. Only enforced when API_TOKEN is set in the
 * environment — so local dev (no token) stays open, while the deployed 24/7
 * server (token set) rejects anyone not sending it. Single-user app: one token,
 * sent by the macOS client as `Authorization: Bearer <token>`.
 */
export function middleware(request: NextRequest) {
  const expected = process.env.API_TOKEN
  if (!expected) return NextResponse.next() // unset = open (local dev)

  const header = request.headers.get('authorization') ?? ''
  const provided = header.startsWith('Bearer ') ? header.slice(7) : ''

  if (!provided || !timingSafeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return NextResponse.next()
}

// Constant-time compare so a wrong token can't be guessed by response timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

export const config = {
  matcher: '/api/:path*',
}
