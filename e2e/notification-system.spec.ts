import { expect, test } from '@playwright/test';

import { E2EHelpers } from './E2EHelpers';

// 테스트 설정
test.describe.configure({ mode: 'serial' });

/**
 * 알림 시스템 관련 노출 조건 검증
 *
 * 검증 내용:
 * 1. 알림이 설정된 시간(notificationTime)에 맞춰 노출되는지
 * 2. 알림이 올바른 메시지 형식으로 표시되는지
 * 3. 알림 닫기 기능이 정상 작동하는지
 * 4. 중복 알림이 노출되지 않는지
 * 5. 여러 일정의 알림이 동시에 표시되는지
 * 6. 알림 시간이 지난 일정은 알림이 노출되지 않는지
 */
test.describe('알림 시스템 노출 조건 검증', () => {
  test.beforeAll(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const helpers = new E2EHelpers(page);
    await helpers.waitForPageLoad();
  });

  test.afterEach(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test.describe('1. 알림 노출 조건', () => {
    test('일정 시작 시간 전 설정된 알림 시간에 알림이 노출된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 현재 시간으로부터 5분 후의 일정 생성
      const now = new Date();
      const eventTime = new Date(now.getTime() + 5 * 60 * 1000);
      const eventDate = eventTime.toISOString().split('T')[0];
      const eventStartTime = eventTime.toTimeString().slice(0, 5);
      const eventEndTime = new Date(eventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '5분 후 알림 테스트',
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        category: '업무',
      });

      // 일정이 생성되었는지 확인
      await expect(helpers.getEventLocator('5분 후 알림 테스트').first()).toBeVisible();

      // 알림이 나타날 때까지 대기 (최대 10분)
      // notificationTime이 기본적으로 설정되어 있다고 가정
      const notification = page.locator('text=5분 후 알림 테스트 일정이 시작됩니다');
      await expect(notification).toBeVisible({ timeout: 600000 });
    });

    test('알림 메시지가 올바른 형식으로 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 1분 후의 일정 생성 (빠른 테스트를 위해)
      const now = new Date();
      const eventTime = new Date(now.getTime() + 1 * 60 * 1000);
      const eventDate = eventTime.toISOString().split('T')[0];
      const eventStartTime = eventTime.toTimeString().slice(0, 5);
      const eventEndTime = new Date(eventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '알림 메시지 형식 테스트',
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        category: '업무',
      });

      // 알림 메시지 형식: "{notificationTime}분 후 {title} 일정이 시작됩니다."
      const notification = page.locator('[role="alert"]').filter({
        hasText: '알림 메시지 형식 테스트 일정이 시작됩니다',
      });

      await expect(notification).toBeVisible({ timeout: 120000 });

      // 알림 메시지에 시간 정보가 포함되어 있는지 확인
      const notificationText = await notification.textContent();
      expect(notificationText).toMatch(/\d+분 후.*알림 메시지 형식 테스트 일정이 시작됩니다/);
    });
  });

  test.describe('2. 알림 인터랙션', () => {
    test('알림의 닫기 버튼을 클릭하면 알림이 제거된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const now = new Date();
      const eventTime = new Date(now.getTime() + 1 * 60 * 1000);
      const eventDate = eventTime.toISOString().split('T')[0];
      const eventStartTime = eventTime.toTimeString().slice(0, 5);
      const eventEndTime = new Date(eventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '닫기 버튼 테스트',
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        category: '업무',
      });

      // 알림이 나타날 때까지 대기
      const notification = page.locator('[role="alert"]').filter({
        hasText: '닫기 버튼 테스트',
      });
      await expect(notification).toBeVisible({ timeout: 120000 });

      // 닫기 버튼 클릭
      const closeButton = notification.locator('[data-testid="CloseIcon"]').first();
      await closeButton.click();

      // 알림이 사라졌는지 확인
      await expect(notification).not.toBeVisible();
    });

    test('여러 알림을 개별적으로 닫을 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const now = new Date();

      // 첫 번째 일정
      const eventTime1 = new Date(now.getTime() + 1 * 60 * 1000);
      const eventDate1 = eventTime1.toISOString().split('T')[0];
      const eventStartTime1 = eventTime1.toTimeString().slice(0, 5);
      const eventEndTime1 = new Date(eventTime1.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '첫 번째 알림',
        date: eventDate1,
        startTime: eventStartTime1,
        endTime: eventEndTime1,
        category: '업무',
      });

      // 두 번째 일정 (1.5분 후)
      const eventTime2 = new Date(now.getTime() + 1.5 * 60 * 1000);
      const eventDate2 = eventTime2.toISOString().split('T')[0];
      const eventStartTime2 = eventTime2.toTimeString().slice(0, 5);
      const eventEndTime2 = new Date(eventTime2.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '두 번째 알림',
        date: eventDate2,
        startTime: eventStartTime2,
        endTime: eventEndTime2,
        category: '업무',
      });

      // 첫 번째 알림이 나타날 때까지 대기
      const notification1 = page.locator('[role="alert"]').filter({
        hasText: '첫 번째 알림',
      });
      await expect(notification1).toBeVisible({ timeout: 120000 });

      // 두 번째 알림이 나타날 때까지 대기
      const notification2 = page.locator('[role="alert"]').filter({
        hasText: '두 번째 알림',
      });
      await page.getByRole('button', { name: '계속 진행' }).click();
      await expect(notification2).toBeVisible({ timeout: 60000 });

      // 첫 번째 알림만 닫기
      const closeButton1 = notification1.locator('[data-testid="CloseIcon"]');
      await closeButton1.click();

      // 첫 번째 알림은 사라지고, 두 번째 알림은 여전히 표시
      await expect(notification1).not.toBeVisible();
      await expect(notification2).toBeVisible();

      // 두 번째 알림도 닫기
      const closeButton2 = notification2.locator('[data-testid="CloseIcon"]');
      await closeButton2.click();

      await expect(notification2).not.toBeVisible();
    });
  });

  test.describe('3. 알림 노출 제외 조건', () => {
    test('이미 알림이 표시된 일정은 중복 알림이 노출되지 않는다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const now = new Date();
      const eventTime = new Date(now.getTime() + 1 * 60 * 1000);
      const eventDate = eventTime.toISOString().split('T')[0];
      const eventStartTime = eventTime.toTimeString().slice(0, 5);
      const eventEndTime = new Date(eventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '중복 알림 방지 테스트',
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        category: '업무',
      });

      // 알림이 나타날 때까지 대기
      const notification = page.locator('[role="alert"]').filter({
        hasText: '중복 알림 방지 테스트',
      });
      await expect(notification).toBeVisible({ timeout: 120000 });

      // 알림 개수 확인
      const notificationCount = await page
        .locator('[role="alert"]')
        .filter({
          hasText: '중복 알림 방지 테스트',
        })
        .count();

      // 같은 일정에 대한 알림은 하나만 표시되어야 함
      expect(notificationCount).toBe(1);

      // 추가로 5초 대기 후에도 중복 알림이 생성되지 않는지 확인
      await page.waitForTimeout(5000);
      const finalNotificationCount = await page
        .locator('[role="alert"]')
        .filter({
          hasText: '중복 알림 방지 테스트',
        })
        .count();

      expect(finalNotificationCount).toBe(1);
    });

    test('알림 시간이 지난 일정은 알림이 노출되지 않는다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 이미 시작 시간이 지난 과거 일정 생성
      const past = new Date();
      past.setHours(past.getHours() - 2);
      const pastDate = past.toISOString().split('T')[0];
      const pastStartTime = past.toTimeString().slice(0, 5);
      const pastEndTime = new Date(past.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);

      await helpers.createEvent({
        title: '과거 일정 알림 테스트',
        date: pastDate,
        startTime: pastStartTime,
        endTime: pastEndTime,
        category: '업무',
      });

      // 일정이 생성되었는지 확인
      await expect(helpers.getEventLocator('과거 일정 알림 테스트').first()).toBeVisible();

      // 5초 대기 후 알림이 표시되지 않는지 확인
      await page.waitForTimeout(5000);

      const notification = page.locator('[role="alert"]').filter({
        hasText: '과거 일정 알림 테스트',
      });

      await expect(notification).not.toBeVisible();
    });
  });

  test.describe('4. 여러 일정의 알림 동시 표시', () => {
    test('여러 일정의 알림이 동시에 스택 형태로 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const now = new Date();

      // 첫 번째 일정 (1분 후)
      const eventTime1 = new Date(now.getTime() + 1 * 60 * 1000);
      await helpers.createEvent({
        title: '동시 알림 1',
        date: eventTime1.toISOString().split('T')[0],
        startTime: eventTime1.toTimeString().slice(0, 5),
        endTime: new Date(eventTime1.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
        category: '업무',
      });

      // 두 번째 일정 (1분 5초 후 - 거의 동시)
      const eventTime2 = new Date(now.getTime() + 1.08 * 60 * 1000);
      await helpers.createEvent({
        title: '동시 알림 2',
        date: eventTime2.toISOString().split('T')[0],
        startTime: eventTime2.toTimeString().slice(0, 5),
        endTime: new Date(eventTime2.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
        category: '업무',
      });
      await page.getByRole('button', { name: '계속 진행' }).click();

      // 세 번째 일정 (1분 10초 후 - 거의 동시)
      const eventTime3 = new Date(now.getTime() + 1.17 * 60 * 1000);
      await helpers.createEvent({
        title: '동시 알림 3',
        date: eventTime3.toISOString().split('T')[0],
        startTime: eventTime3.toTimeString().slice(0, 5),
        endTime: new Date(eventTime3.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5),
        category: '업무',
      });
      await page.getByRole('button', { name: '계속 진행' }).click();

      // 모든 알림이 나타날 때까지 대기
      await expect(page.locator('[role="alert"]').filter({ hasText: '동시 알림 1' })).toBeVisible({
        timeout: 120000,
      });

      await expect(page.locator('[role="alert"]').filter({ hasText: '동시 알림 2' })).toBeVisible({
        timeout: 30000,
      });

      await expect(page.locator('[role="alert"]').filter({ hasText: '동시 알림 3' })).toBeVisible({
        timeout: 30000,
      });

      // 3개의 알림이 모두 표시되는지 확인
      const alertCount = await page.locator('[role="alert"]').count();
      expect(alertCount).toBeGreaterThanOrEqual(3);
    });
  });

  test.describe('5. 일정 수정 시 알림 동작', () => {
    test('일정 시간을 수정하면 알림 시간도 함께 업데이트된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 5분 후의 일정 생성
      const now = new Date();
      const eventTime = new Date(now.getTime() + 5 * 60 * 1000);
      const eventDate = eventTime.toISOString().split('T')[0];
      const eventStartTime = eventTime.toTimeString().slice(0, 5);
      const eventEndTime = new Date(eventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.createEvent({
        title: '시간 수정 알림 테스트',
        date: eventDate,
        startTime: eventStartTime,
        endTime: eventEndTime,
        category: '업무',
      });

      // 일정 시간을 1분 후로 수정
      const newEventTime = new Date(now.getTime() + 1 * 60 * 1000);
      const newStartTime = newEventTime.toTimeString().slice(0, 5);
      const newEndTime = new Date(newEventTime.getTime() + 60 * 60 * 1000)
        .toTimeString()
        .slice(0, 5);

      await helpers.updateEvent('시간 수정 알림 테스트', {
        startTime: newStartTime,
        endTime: newEndTime,
      });

      // 수정된 시간 기준으로 알림이 나타나는지 확인
      const notification = page.locator('[role="alert"]').filter({
        hasText: '시간 수정 알림 테스트',
      });

      await expect(notification).toBeVisible({ timeout: 120000 });
    });
  });

  test.describe('6. 알림이 없는 경우', () => {
    test('알림이 노출될 일정이 없으면 알림 스택이 표시되지 않는다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 충분히 미래의 일정만 생성 (1시간 후)
      const future = new Date();
      future.setHours(future.getHours() + 1);
      const futureDate = future.toISOString().split('T')[0];
      const futureStartTime = future.toTimeString().slice(0, 5);
      const futureEndTime = new Date(future.getTime() + 60 * 60 * 1000).toTimeString().slice(0, 5);

      await helpers.createEvent({
        title: '먼 미래 일정',
        date: futureDate,
        startTime: futureStartTime,
        endTime: futureEndTime,
        category: '업무',
      });

      // 일정 생성 확인
      await expect(helpers.getEventLocator('먼 미래 일정').first()).toBeVisible();

      // 5초 대기 후 알림 스택이 표시되지 않는지 확인
      await page.waitForTimeout(5000);

      const notificationStack = page.locator('[style*="position: fixed"]').filter({
        has: page.locator('[role="alert"]'),
      });

      // 알림이 없으면 스택 자체가 렌더링되지 않음
      const stackCount = await notificationStack.count();
      expect(stackCount).toBe(0);
    });
  });
});
