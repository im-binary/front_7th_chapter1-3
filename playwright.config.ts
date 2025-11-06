import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  // 워커별 독립 DB 사용으로 병렬 실행 가능
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  // 로컬에서는 CPU 코어 수만큼, CI에서는 1개 워커 사용
  // workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'dot' : 'html',
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    // 각 테스트 요청에 워커 ID를 헤더로 전달
    extraHTTPHeaders: {
      'X-Test-Worker-Index': process.env.TEST_PARALLEL_INDEX || '0',
    },
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: [
    {
      command: 'pnpm run server:e2e',
      port: 3000,
      reuseExistingServer: false,
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        TEST_ENV: 'e2e',
      },
    },
    {
      command: 'pnpm run start',
      port: 5173,
      reuseExistingServer: !process.env.CI,
    },
  ],
});
