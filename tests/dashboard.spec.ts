import { test, expect, type Page } from '@playwright/test'

function localToday() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

async function taskIdByTitle(page: Page, title: string): Promise<string | null> {
  const res = await page.request.get('http://localhost:3000/api/tasks')
  if (!res.ok()) return null
  const body = await res.json()
  const list: Array<{ id: string; title: string }> = Array.isArray(body) ? body : body.tasks ?? []
  return list.find((t) => t.title === title)?.id ?? null
}

test.describe('Today completion workflow', () => {
  let usedTaskId: string | null = null
  let usedDate = ''

  test.afterEach(async ({ page }) => {
    // Restore the exact pre-test state: the occurrence was incomplete before
    // the test ran, so deleting today's completion (if any) restores it.
    // A 404 here simply means there is nothing to clean up.
    if (usedTaskId) {
      await page
        .request.delete('http://localhost:3000/api/completions', {
          data: { taskId: usedTaskId, dateStr: usedDate },
        })
        .catch(() => null)
      usedTaskId = null
    }
  })

  test('complete → undo → complete again leaves score consistent', async ({ page }) => {
    const today = localToday()
    usedDate = today

    const dayBefore = await (
      await page.request.get(`http://localhost:3000/api/progress/day?date=${today}`)
    ).json()

    await page.goto('http://localhost:3000/')
    const completeBtn = page.getByRole('button', { name: /Complete \+/ }).first()
    await expect(completeBtn).toBeVisible()
    const points = Number(/\+(\d+)/.exec((await completeBtn.innerText()) ?? '')?.[1] ?? 0)
    expect(points).toBeGreaterThan(0)

    // Complete (wait for the authoritative POST, not just optimistic UI)
    const postPromise = page.waitForResponse(
      (r) => r.url().includes('/api/completions') && r.request().method() === 'POST'
    )
    await completeBtn.click()
    await postPromise

    const undoBtn = page.getByRole('button', { name: /^Undo/ })
    await expect(undoBtn).toBeVisible()
    const title = ((await undoBtn.getAttribute('aria-label')) ?? '').replace('Undo completion of ', '')
    expect(title.length).toBeGreaterThan(0)
    usedTaskId = await taskIdByTitle(page, title)
    expect(usedTaskId).not.toBeNull()

    // Progress reflects the completion
    const dayAfter = await (
      await page.request.get(`http://localhost:3000/api/progress/day?date=${today}`)
    ).json()
    expect(dayAfter.earned - dayBefore.earned).toBe(points)

    // Undo (wait for authoritative DELETE)
    const deletePromise = page.waitForResponse(
      (r) => r.url().includes('/api/completions') && r.request().method() === 'DELETE'
    )
    await undoBtn.click()
    await deletePromise
    await expect(page.getByRole('button', { name: /Complete \+/ }).first()).toBeVisible()

    const dayUndone = await (
      await page.request.get(`http://localhost:3000/api/progress/day?date=${today}`)
    ).json()
    expect(dayUndone.earned).toBe(dayBefore.earned)

    // Complete again works after undo
    const postAgain = page.waitForResponse(
      (r) => r.url().includes('/api/completions') && r.request().method() === 'POST'
    )
    await page.getByRole('button', { name: /Complete \+/ }).first().click()
    await postAgain
    await expect(page.getByRole('button', { name: /^Undo/ })).toBeVisible()

    // Final undo leaves the database exactly as found
    const deleteAgain = page.waitForResponse(
      (r) => r.url().includes('/api/completions') && r.request().method() === 'DELETE'
    )
    await page.getByRole('button', { name: /^Undo/ }).click()
    await deleteAgain
    usedTaskId = null
  })

  test('today page has no horizontal overflow on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000/')
    await expect(page.locator('h2:has-text("Today\'s Tasks")')).toBeVisible()
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth
    )
    expect(overflow).toBeLessThanOrEqual(1)
  })
})
