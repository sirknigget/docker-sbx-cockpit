import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:9877',
    ...devices['Desktop Chrome'],
    viewport: { width: 1440, height: 1000 },
    locale: 'en-US',
    timezoneId: 'UTC',
    colorScheme: 'light',
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
  },
  expect: {
    toHaveScreenshot: { animations: 'disabled', maxDiffPixels: 0 },
  },
  webServer: {
    command: 'npm run build && npx tsx scripts/fixture-server.ts',
    url: 'http://127.0.0.1:9877/api/health',
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
