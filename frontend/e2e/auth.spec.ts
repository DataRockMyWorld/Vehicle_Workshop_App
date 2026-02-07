import { test, expect } from '@playwright/test'

const TEST_EMAIL = process.env.PW_TEST_EMAIL || 'admin@test.com'
const TEST_PASSWORD = process.env.PW_TEST_PASSWORD || 'testpass123'

test.describe('Login', () => {
  test('unauthenticated user is redirected to login', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('login page shows branding and form', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: /feeling autopart/i })).toBeVisible()
    await expect(page.getByLabel(/email/i)).toBeVisible()
    await expect(page.getByLabel(/password/i)).toBeVisible()
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible()
  })

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill('wrong@example.com')
    await page.getByLabel(/password/i).fill('wrongpassword')
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 5000 })
  })

  test('valid login redirects to dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel(/email/i).fill(TEST_EMAIL)
    await page.getByLabel(/password/i).fill(TEST_PASSWORD)
    await page.getByRole('button', { name: /sign in/i }).click()
    await expect(page).toHaveURL('/', { timeout: 10000 })
    await expect(page.getByRole('link', { name: /dashboard/i })).toBeVisible()
  })
})
