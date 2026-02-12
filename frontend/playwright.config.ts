import { defineConfig, devices } from '@playwright/test'

/**
 * E2E tests require:
 * - Backend running (docker compose up) on port 8000
 * - Test user: create via `docker compose exec web python manage.py shell` or use createsuperuser
 * - Env vars (optional): PW_TEST_EMAIL, PW_TEST_PASSWORD for login
 *   Default: admin@test.com / testpass123 (create this user for E2E)
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'setup', testMatch: /auth\.setup\.ts/ },
    { name: 'auth', use: { ...devices['Desktop Chrome'] }, testMatch: /auth\.spec\.ts/ },
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        storageState: 'playwright/.auth/user.json',
      },
      dependencies: ['setup'],
      testIgnore: [/auth\.spec\.ts/],
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: process.env.CI !== 'true',
    timeout: 120 * 1000,
  },
})
