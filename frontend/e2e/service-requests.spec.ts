import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.PW_TEST_EMAIL || 'admin@test.com'
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD || 'testpass123'

test.describe('Service requests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
  })

  test('navigates to service requests and shows page', async ({ page }) => {
    await page.getByRole('link', { name: /service requests/i }).click()
    await expect(page).toHaveURL(/\/service-requests/)
    await expect(page.getByRole('heading', { name: /service requests/i })).toBeVisible({ timeout: 5000 })
  })

  test('shows list or empty state', async ({ page }) => {
    await page.goto('/service-requests')
    await expect(page.getByRole('heading', { name: /service requests/i })).toBeVisible({ timeout: 5000 })
    await expect(
      page.getByRole('table').or(page.getByText(/no service requests/i))
    ).toBeVisible({ timeout: 15000 })
  })

  test('can navigate to new service request (if canWrite)', async ({ page }) => {
    await page.goto('/service-requests')
    const newBtn = page.getByRole('link', { name: /new service request/i })
    const isVisible = await newBtn.isVisible().catch(() => false)
    if (isVisible) {
      await newBtn.click()
      await expect(page).toHaveURL(/\/service-requests\/new/)
    }
  })
})
