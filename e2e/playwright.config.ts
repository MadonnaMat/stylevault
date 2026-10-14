import { defineConfig, devices } from '@playwright/test';

const WEB_PORT = process.env.E2E_WEB_PORT ?? '4300';
const API_PORT = process.env.E2E_API_PORT ?? '3100';

export default defineConfig({
  testDir: './tests',
  // The tests share one database, so run them one at a time.
  workers: 1,
  fullyParallel: false,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'node start-stack.mjs',
    // Wait for both the web app and the API (through the web app's proxy).
    url: `http://localhost:${WEB_PORT}/api/categories`,
    timeout: 180_000,
    reuseExistingServer: false,
    stdout: 'pipe',
    gracefulShutdown: { signal: 'SIGTERM', timeout: 15_000 },
    env: { E2E_WEB_PORT: WEB_PORT, E2E_API_PORT: API_PORT },
  },
});
