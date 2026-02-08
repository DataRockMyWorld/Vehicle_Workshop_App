import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows dashboard content after login', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5000 })
  })

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /service requests/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /customers/i })).toBeVisible()
  })
})
