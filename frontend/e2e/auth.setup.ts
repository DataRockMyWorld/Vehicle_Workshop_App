import { test as setup, expect } from '@playwright/test'

const AUTH_FILE = 'playwright/.auth/user.json'

const TEST_EMAIL = process.env.PW_TEST_EMAIL || 'admin@test.com'
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD || 'testpass123'

setup('authenticate', async ({ page }) => {
  await page.goto('/login')
  await page.getByLabel(/email/i).fill(TEST_EMAIL)
  await page.getByLabel(/password/i).fill(TEST_PASSWORD)
  await page.getByRole('button', { name: /sign in/i }).click()
  await expect(page).toHaveURL('/', { timeout: 20000 })
  await page.context().storageState({ path: AUTH_FILE })
})
