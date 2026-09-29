import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { NextRequest } from 'next/server'
import { middleware, config } from '@/middleware'

const TOKEN = 'test-token-123'
const basic = (user: string, pass: string) => 'Basic ' + Buffer.from(`${user}:${pass}`).toString('base64')
const req = (path: string, authorization?: string) =>
  new NextRequest(`http://localhost${path}`, { headers: authorization ? { authorization } : {} })
// NextResponse.next() marks the response so Next continues to the route.
const passed = (res: Response) => res.headers.get('x-middleware-next') === '1'

describe('middleware auth', () => {
  let saved: string | undefined
  beforeEach(() => {
    saved = process.env.API_TOKEN
    process.env.API_TOKEN = TOKEN
  })
  afterEach(() => {
    if (saved === undefined) delete process.env.API_TOKEN
    else process.env.API_TOKEN = saved
  })

  it('is open when API_TOKEN is unset (local dev)', () => {
    delete process.env.API_TOKEN
    expect(passed(middleware(req('/')))).toBe(true)
    expect(passed(middleware(req('/api/tasks')))).toBe(true)
  })

  it('protects pages that render data server-side, with a browser login prompt', () => {
    for (const path of ['/', '/progress', '/tasks']) {
      const res = middleware(req(path))
      expect(res.status).toBe(401)
      expect(res.headers.get('www-authenticate')).toMatch(/^Basic realm="ScoreDay"/)
    }
  })

  it('rejects API calls without a prompt header', () => {
    const res = middleware(req('/api/tasks'))
    expect(res.status).toBe(401)
    expect(res.headers.get('www-authenticate')).toBeNull()
  })

  it('accepts the Bearer token (macOS app) on pages and API', () => {
    expect(passed(middleware(req('/api/tasks', `Bearer ${TOKEN}`)))).toBe(true)
    expect(passed(middleware(req('/', `Bearer ${TOKEN}`)))).toBe(true)
  })

  it('accepts Basic auth with the token as password, any username (browser)', () => {
    expect(passed(middleware(req('/', basic('me', TOKEN))))).toBe(true)
    expect(passed(middleware(req('/api/completions', basic('', TOKEN))))).toBe(true)
  })

  // The original leak was the matcher ('/api/:path*'): pages never reached the guard.
  it('runs on pages and API, skipping only static build assets', () => {
    const runsOn = (path: string) => new RegExp(`^${config.matcher}$`).test(path)
    for (const path of ['/', '/progress', '/tasks', '/settings', '/api/tasks', '/api/admin/export']) {
      expect(runsOn(path)).toBe(true)
    }
    for (const path of ['/_next/static/chunks/main.js', '/_next/image', '/favicon.ico']) {
      expect(runsOn(path)).toBe(false)
    }
  })

  it('rejects wrong or malformed credentials', () => {
    for (const auth of [`Bearer wrong`, basic('me', 'wrong'), basic(TOKEN, 'x'), 'Basic !!notbase64', TOKEN]) {
      expect(middleware(req('/api/tasks', auth)).status).toBe(401)
      expect(middleware(req('/', auth)).status).toBe(401)
    }
  })
})
