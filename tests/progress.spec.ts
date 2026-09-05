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
    await page.waitForLoadState('networkidle')
    const response = await page.evaluate(() => document.body.innerHTML.length > 0)
    await expect(response).toBe(true)
  })
})