import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.PW_TEST_EMAIL || 'admin@test.com'
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD || 'testpass123'

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('shows dashboard content after login', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible({ timeout: 5000 })
  })

  test('sidebar navigation is visible', async ({ page }) => {
    await expect(page.getByRole('link', { name: /service requests/i })).toBeVisible()
    await expect(page.getByRole('link', { name: /customers/i })).toBeVisible()
  })
})
