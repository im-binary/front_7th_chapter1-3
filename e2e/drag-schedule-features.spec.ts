import { expect, test } from '@playwright/test';

import { dragAndDrop } from './utils/dragAndDrop';
import { E2EHelpers } from './utils/E2EHelpers';

/**
 * 고정된 테스트 날짜 반환 (2025년 6월 10일~30일)
 * - 월 경계를 넘지 않는 안전한 날짜
 * - 테스트 시작 시 navigateToMonth(2025, 6)로 이동 필요
 */
function getTestDates() {
  return {
    firstDayOfMonth: '2025-11-01',
    today: '2025-11-10',
    tomorrow: '2025-11-11',
    startDate: '2025-11-11', // 내일부터 시작
    endDate5Days: '2025-11-16', // 6일간 (11일 + 5일)
    endDate14Days: '2025-11-25', // 15일간
    endDate7Days: '2025-11-18', // 8일간
    endDate10Days: '2025-11-21', // 11일간
    midDate: '2025-11-13', // 시작일로부터 2일 후
    endDateMonths: '2025-11-10', // 약 3개월 후
    endDateYears: '2028-11-10', // 약 3년 후
  };
}

test.describe('드래그 앤 드롭 기능 E2E 테스트', () => {
  let helpers: E2EHelpers;

  test.beforeEach(async ({ page, request }) => {
    await E2EHelpers.cleanupTestData(request);

    helpers = new E2EHelpers(page);

    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    await helpers.waitForPageLoad();
    await helpers.navigateToMonth(2025, 11);
  });

  test.afterEach(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test('월간 뷰에서 일반 일정을 드래그 앤 드롭으로 다른 날짜로 이동할 수 있다', async ({
    page,
  }) => {
    const dates = getTestDates();

    // Given: 일정 생성 (폼 사용)
    await helpers.createEvent({
      title: '이동할 일정',
      date: dates.today,
      startTime: '12:00',
      endTime: '13:00',
      description: '드래그 테스트용 일정',
      location: '회의실 A',
      category: '업무',
    });

    // 월간 뷰로 명시적으로 전환
    await helpers.changeView('month');
    await page.waitForTimeout(500);

    // When: 10일의 일정을 15일로 드래그
    const monthView = page.getByTestId('month-view');

    // draggable 속성을 가진 요소를 찾아서 드래그
    const sourceEvent = monthView
      .locator('div[draggable="true"]')
      .filter({ hasText: '이동할 일정' })
      .first();

    // 15일 셀 찾기
    const targetCell = monthView.locator('table tbody tr td').filter({ hasText: /^15$/ }).first();

    // 드래그 전 소스 이벤트와 타겟 셀이 있는지 확인
    await expect(sourceEvent).toBeVisible({ timeout: 5000 });
    await expect(targetCell).toBeVisible({ timeout: 5000 });

    await dragAndDrop(page, sourceEvent, targetCell);
    await page.waitForTimeout(1000);

    // Then: 일정 목록에서 날짜가 변경되었는지 확인
    const eventList = page.getByTestId('event-list');
    await expect(eventList.getByText('2025-11-15')).toBeVisible({ timeout: 5000 });

    // 타겟 셀에 일정이 표시되는지 확인
    const targetCellWithEvent = monthView
      .locator('table tbody tr td')
      .filter({ hasText: /15/ })
      .getByText('이동할 일정');
    await expect(targetCellWithEvent).toBeVisible();
  });

  test('주간 뷰에서도 드래그 앤 드롭이 동작한다', async ({ page }) => {
    // Given: 일정 생성
    const dates = getTestDates();

    await helpers.createEvent({
      title: '주간 드래그 테스트',
      date: dates.today,
      startTime: '12:00',
      endTime: '13:00',
      description: '드래그 테스트용 일정',
      location: '회의실 A',
      category: '업무',
    });

    // 주간 뷰로 전환
    await helpers.changeView('week');
    await page.waitForTimeout(500);
    await page.locator('button[aria-label="Next"]').click();

    // When: 일정을 다음 날로 드래그
    const weekView = page.getByTestId('week-view');

    // draggable 속성을 가진 요소 찾기
    const sourceEvent = weekView
      .locator('div[draggable="true"]')
      .filter({ hasText: '주간 드래그 테스트' })
      .first();

    await expect(sourceEvent).toBeVisible({ timeout: 5000 });

    // 다음 날 셀 찾기 (월요일 -> 화요일)
    const targetCell = weekView.locator('table tbody tr td').filter({ hasText: /^15$/ }).first();

    await dragAndDrop(page, sourceEvent, targetCell);
    await page.waitForTimeout(1000);

    // Then: 일정 목록에서 날짜가 변경되었는지 확인
    const eventList = page.getByTestId('event-list');
    await expect(eventList.getByText('2025-11-15')).toBeVisible({ timeout: 5000 });
  });

  test('반복 일정을 드래그하면 수정 확인 다이얼로그가 표시된다', async ({ page }) => {
    // Given: 반복 일정 생성
    const dates = getTestDates();

    await helpers.createRecurringEvent({
      title: '주간 리뷰',
      date: dates.startDate,
      startTime: '16:00',
      endTime: '17:00',
      description: '주간 업무 리뷰',
      location: '회의실 D',
      category: '업무',
      repeatType: 'weekly',
      repeatInterval: 1,
      repeatEndDate: dates.endDate14Days,
    });

    // When: 반복 일정을 드래그
    const monthView = page.getByTestId('month-view');
    const sourceEvent = monthView.getByText('주간 리뷰').first();
    const targetCell = monthView.locator('table tbody tr td').filter({ hasText: /^12$/ }).first();

    await dragAndDrop(page, sourceEvent, targetCell);
    await page.waitForTimeout(500);

    // Then: 반복 일정 수정 다이얼로그가 표시되어야 함
    await expect(page.getByRole('dialog')).toBeVisible();
    await expect(page.getByText(/반복 일정 수정/)).toBeVisible();
    await expect(page.getByText('해당 일정만')).toBeVisible();
  });

  test('드래그로 일정을 이동할 때 겹치는 일정이 있으면 경고가 표시된다', async ({ page }) => {
    const dates = getTestDates();

    // Given: 두 개의 일정 생성 (같은 시간대)
    await helpers.createEvent({
      title: '기존 회의',
      date: dates.today,
      startTime: '16:00',
      endTime: '17:00',
      description: '일일 업무 리뷰',
      location: '회의실 D',
      category: '업무',
    });

    await helpers.createEvent({
      title: '이동할 회의',
      date: dates.tomorrow,
      startTime: '16:00',
      endTime: '17:00',
      description: '일일 업무 리뷰',
      location: '회의실 D',
      category: '업무',
    });

    // When: '이동할 회의'를 기존 회의와 겹치는 날짜로 드래그
    const monthView = page.getByTestId('month-view');

    // draggable 속성을 가진 요소를 찾아서 드래그
    const sourceEvent = monthView
      .locator('div[draggable="true"]')
      .filter({ hasText: '이동할 회의' })
      .first();

    await expect(sourceEvent).toBeVisible({ timeout: 5000 });

    const targetCell = monthView.locator('table tbody tr td').filter({ hasText: /10/ }).first();

    await expect(targetCell).toBeVisible();

    await dragAndDrop(page, sourceEvent, targetCell);
    await page.waitForTimeout(1500);

    // Then: 겹침 경고 알림이 표시되어야 함
    await expect(page.getByText(/겹치는 일정|이 날짜\/시간에 겹치는 일정이 있어/)).toBeVisible({
      timeout: 5000,
    });
  });
});
