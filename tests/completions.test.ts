import { describe, it, expect, beforeEach, vi } from 'vitest'
import { POST, DELETE } from '@/app/api/completions/route'

interface StoredCompletion {
  id: string
  taskId: string
  occurrenceDate: string
  completedOn: string
  pointsEarned: number
}

const { tasks, store } = vi.hoisted(() => {
  const tasks = [
    {
      id: 't1', title: 'Daily', description: null, category: null, points: 10,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01', active: true,
    },
    {
      id: 't2', title: 'Inactive', description: null, category: null, points: 10,
      recurrenceType: 'DAILY', interval: 1, startDate: '2026-01-01', active: false,
    },
    {
      id: 't3', title: 'Goal', description: null, category: null, points: 5,
      recurrenceType: 'WEEKLY_GOAL', interval: 1, startDate: '2026-01-01', active: true,
    },
  ]
  const store: StoredCompletion[] = []
  return { tasks, store }
})

vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn((args: { where: { id: string } }) =>
        Promise.resolve(tasks.find(t => t.id === args.where.id) ?? null)
      ),
    },
    taskCompletion: {
      findUnique: vi.fn((args: { where: { taskId_occurrenceDate: { taskId: string; occurrenceDate: string } } }) => {
        const { taskId, occurrenceDate } = args.where.taskId_occurrenceDate
        return Promise.resolve(
          store.find(c => c.taskId === taskId && c.occurrenceDate === occurrenceDate) ?? null
        )
      }),
      create: vi.fn((args: { data: Omit<StoredCompletion, 'id'> }) => {
        const record = { ...args.data, id: `c${store.length + 1}` }
        store.push(record)
        return Promise.resolve(record)
      }),
      deleteMany: vi.fn((args: { where: { taskId: string; occurrenceDate: string } }) => {
        const before = store.length
        for (let i = store.length - 1; i >= 0; i--) {
          if (store[i].taskId === args.where.taskId && store[i].occurrenceDate === args.where.occurrenceDate) {
            store.splice(i, 1)
          }
        }
        return Promise.resolve({ count: before - store.length })
      }),
    },
  },
}))

function req(method: string, body: unknown) {
  return new Request('http://localhost/api/completions', {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

beforeEach(() => {
  store.length = 0
})

describe('POST /api/completions', () => {
  it('creates a completion with snapshotted points', async () => {
    const res = await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    expect(res.status).toBe(200)
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.completion.pointsEarned).toBe(10)
    expect(body.completion.occurrenceDate).toBe('2026-09-04')
    expect(store.length).toBe(1)
  })

  it('is idempotent on duplicate completion', async () => {
    await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    const res = await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(store.length).toBe(1)
  })

  it('treats a weekly goal completed twice in one week as duplicate', async () => {
    await POST(req('POST', { taskId: 't3', dateStr: '2026-09-02' }))
    const res = await POST(req('POST', { taskId: 't3', dateStr: '2026-09-04' }))
    const body = await res.json()
    expect(body.duplicate).toBe(true)
    expect(store.length).toBe(1)
  })

  it('rejects unknown tasks with 404', async () => {
    const res = await POST(req('POST', { taskId: 'nope', dateStr: '2026-09-04' }))
    expect(res.status).toBe(404)
  })

  it('rejects inactive tasks with 400', async () => {
    const res = await POST(req('POST', { taskId: 't2', dateStr: '2026-09-04' }))
    expect(res.status).toBe(400)
    expect(store.length).toBe(0)
  })

  it('rejects missing taskId with 400', async () => {
    const res = await POST(req('POST', { dateStr: '2026-09-04' }))
    expect(res.status).toBe(400)
  })
})

describe('DELETE /api/completions (undo)', () => {
  it('removes only the target occurrence', async () => {
    await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    await POST(req('POST', { taskId: 't1', dateStr: '2026-09-05' }))
    const res = await DELETE(req('DELETE', { taskId: 't1', dateStr: '2026-09-04' }))
    expect(res.status).toBe(200)
    expect((await res.json()).success).toBe(true)
    expect(store.map(c => c.occurrenceDate)).toEqual(['2026-09-05'])
  })

  it('second undo of the same occurrence returns alreadyUndone, not an error state', async () => {
    await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    await DELETE(req('DELETE', { taskId: 't1', dateStr: '2026-09-04' }))
    const res = await DELETE(req('DELETE', { taskId: 't1', dateStr: '2026-09-04' }))
    expect(res.status).toBe(404)
    expect((await res.json()).alreadyUndone).toBe(true)
  })

  it('allows completing again after undo', async () => {
    await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    await DELETE(req('DELETE', { taskId: 't1', dateStr: '2026-09-04' }))
    const res = await POST(req('POST', { taskId: 't1', dateStr: '2026-09-04' }))
    const body = await res.json()
    expect(body.success).toBe(true)
    expect(body.duplicate).toBeUndefined()
    expect(store.length).toBe(1)
  })

  it('rejects unknown tasks with 404', async () => {
    const res = await DELETE(req('DELETE', { taskId: 'nope', dateStr: '2026-09-04' }))
    expect(res.status).toBe(404)
  })

  it('rejects malformed dates with 400', async () => {
    const res = await DELETE(req('DELETE', { taskId: 't1', dateStr: 'yesterday' }))
    expect(res.status).toBe(400)
  })

  it('rejects missing taskId with 400', async () => {
    const res = await DELETE(req('DELETE', { dateStr: '2026-09-04' }))
    expect(res.status).toBe(400)
  })
})
