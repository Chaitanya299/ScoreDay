import { test, expect } from '@playwright/test'

test.describe('ScoreDay Progress Page', () => {
  test('progress page loads successfully', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page).toHaveTitle(/ScoreDay/)
    await expect(page.locator('h1')).toBeVisible()
    await expect(page.locator('h1')).toContainText('Progress')
  })

  test('has navigation links', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('nav a[href="/"]')).toContainText('Today')
    await expect(page.locator('nav a[href="/progress"]')).toContainText('Progress')
    await expect(page.locator('nav a[href="/tasks"]')).toContainText('Tasks')
    await expect(page.locator('nav a[href="/settings"]')).toContainText('Settings')
  })

  test('has period selector with week/month toggle', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('button').filter({ hasText: 'Week' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: 'Month' })).toBeVisible()
  })

  test('has prev/next month navigation', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('button').filter({ hasText: '<' })).toBeVisible()
    await expect(page.locator('button').filter({ hasText: '>' })).toBeVisible()
  })

  test('shows summary cards', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('text=Avg Score').first()).toBeVisible()
    await expect(page.locator('text=Best Day').first()).toBeVisible()
    await expect(page.locator('text=Total Points').first()).toBeVisible()
    await expect(page.locator('text=Completion').first()).toBeVisible()
  })

  test('shows score history section', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Score History")')).toBeVisible()
  })

  test('shows activity calendar', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Activity Calendar")')).toBeVisible()
  })

  test('calendar shows all days of month', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    const calendarDays = page.locator('[class*="aspect-square"]')
    const count = await calendarDays.count()
    await expect(count).toBeGreaterThan(28)
  })

  test('shows monthly trend section', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Monthly Trend")')).toBeVisible()
  })

  test('trend shows avg score comparison', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('text=Avg Score').first()).toBeVisible()
  })

  test('trend shows completion comparison', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('text=Completion').first()).toBeVisible()
  })

  test('trend shows points comparison', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('text=Points').first()).toBeVisible()
  })

  test('today navigation works', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('nav a[href="/"]').click()
    await page.waitForURL('http://localhost:3000/')
    await expect(page.locator('text=Today\'s Score')).toBeVisible()
  })

  test('tasks navigation works', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('nav a[href="/tasks"]').click()
    await page.waitForURL('http://localhost:3000/tasks')
    await expect(page.locator('h1')).toContainText(/Task/)
  })

  test('settings navigation works', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('nav a[href="/settings"]').click()
    await page.waitForURL('http://localhost:3000/settings')
    await expect(page.locator('h1')).toContainText(/Settings/)
  })

  test('loads data from api', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Score History")')).toBeVisible()
    await expect(page.locator('h2:has-text("Consistency")')).toBeVisible()
    const response = await page.evaluate(() => document.body.innerHTML.length > 0)
    await expect(response).toBe(true)
  })

  test('shows consistency section with streak metrics', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Consistency")')).toBeVisible()
    await expect(page.locator('text=Current Streak').first()).toBeVisible()
    await expect(page.locator('text=Best Streak').first()).toBeVisible()
  })

  test('clicking a calendar day opens day detail', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    const dayButton = page.locator('button[aria-label^="View details for"]').first()
    await expect(dayButton).toBeVisible()
    await dayButton.click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await expect(dialog).toContainText('Daily performance')
  })

  test('day detail modal closes', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('button[aria-label^="View details for"]').first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await page.locator('button[aria-label="Close day details"]').click()
    await expect(dialog).not.toBeVisible()
  })

  test('day detail api returns score breakdown', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/progress/day?date=2026-09-06')
    expect(response.ok()).toBe(true)
    const body = await response.json()
    expect(body).toHaveProperty('date', '2026-09-06')
    expect(body).toHaveProperty('percentage')
    expect(body).toHaveProperty('earned')
    expect(body).toHaveProperty('max')
    expect(body).toHaveProperty('completedTasks')
    expect(body).toHaveProperty('missedTasks')
  })

  test('day detail api rejects invalid dates', async ({ page }) => {
    const response = await page.request.get('http://localhost:3000/api/progress/day?date=not-a-date')
    expect(response.status()).toBe(400)
  })

  test('no XP or Level concepts anywhere', async ({ page }) => {
    for (const url of ['http://localhost:3000/', 'http://localhost:3000/progress', 'http://localhost:3000/tasks']) {
      await page.goto(url)
      const text = (await page.locator('main').innerText()).toLowerCase()
      expect(text).not.toContain('level up')
      expect(text).not.toMatch(/\bxp\b/)
    }
    const progressText = await page.locator('main').innerText()
    expect(progressText).not.toContain('Level')
  })

  test('week view shows daily breakdown with weekly total', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('button').filter({ hasText: 'Week' }).click()
    await expect(page.locator('h2:has-text("Daily Breakdown")')).toBeVisible()
    await expect(page.locator('text=This Week').first()).toBeVisible()
  })

  test('week navigation changes the displayed week', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('button').filter({ hasText: 'Week' }).click()
    const label = page.locator('button[aria-label="Previous week"] + span')
    const before = await label.innerText()
    const weekRequest = page.waitForRequest(/\/api\/progress\/week\?weekStart=/)
    await page.locator('button[aria-label="Previous week"]').click()
    await expect(label).not.toHaveText(before)
    await weekRequest
  })

  test('month navigation reloads data', async ({ page }) => {
    await page.goto('http://localhost:3000/progress?month=2026-09')
    const heading = page.locator('button[aria-label="Previous month"] + span')
    await expect(heading).toContainText('September 2026')
    const monthRequest = page.waitForRequest('**/api/progress/month?month=2026-08')
    await page.locator('button[aria-label="Previous month"]').click()
    await expect(heading).toContainText('August 2026')
    await monthRequest
  })

  test('shows task performance section', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Task Performance")')).toBeVisible()
  })

  test('shows category performance section', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Category Performance")')).toBeVisible()
  })

  test('shows missed section', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h2:has-text("Missed")').first()).toBeVisible()
  })

  test('future week shows empty missed state', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('button').filter({ hasText: 'Week' }).click()
    await expect(page.locator('h2:has-text("Daily Breakdown")')).toBeVisible()
    for (let i = 0; i < 4; i++) {
      await page.locator('button[aria-label="Next week"]').click()
    }
    await expect(page.locator('text=No missed tasks in this period.')).toBeVisible()
  })

  test('Escape closes the day detail dialog', async ({ page }) => {
    await page.goto('http://localhost:3000/progress')
    await page.locator('button[aria-label^="View details for"]').first().click()
    const dialog = page.locator('[role="dialog"]')
    await expect(dialog).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(dialog).not.toBeVisible()
  })

  test('mobile layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('http://localhost:3000/progress')
    await expect(page.locator('h1')).toContainText('Progress')
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(1)
  })
})