import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('shows dashboard content when navigated to', async ({ page }) => {
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { name: /executive dashboard|dashboard|overview/i })).toBeVisible({ timeout: 5000 })
  })

  test('sidebar navigation is visible', async ({ page }) => {
    const nav = page.locator('.layout__nav, .layout__drawer-nav').first()
    await expect(nav.getByRole('link', { name: 'Service requests' })).toBeVisible()
    await expect(nav.getByRole('link', { name: 'Customers' })).toBeVisible()
  })
})
