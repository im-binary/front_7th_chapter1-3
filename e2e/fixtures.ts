import { test as base } from '@playwright/test';

// 워커 인덱스를 HTTP 헤더에 추가하는 fixture
export const test = base.extend({
  // 브라우저 페이지에서 API 요청에 워커 인덱스 헤더 추가
  page: async ({ page }, use, testInfo) => {
    const workerIndex = testInfo.parallelIndex;

    // API 요청 가로채기하여 헤더 추가
    await page.route('**/api/**', async (route) => {
      const headers = {
        ...route.request().headers(),
        'x-test-worker-index': String(workerIndex),
      };
      await route.continue({ headers });
    });

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect } from '@playwright/test';
