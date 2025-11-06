import { E2EHelpers } from './E2EHelpers';
import { expect, test } from './fixtures';

test.describe.configure({ mode: 'serial' });

/**
 * 고정된 테스트 날짜 반환 (2025년 6월 10일~21일)
 * - 월 경계를 넘지 않는 안전한 날짜
 * - 테스트 시작 시 navigateToMonth(2025, 6)로 이동
 */
function getFixedTestDates() {
  return {
    monday: '2025-06-10',
    tuesday: '2025-06-11',
    wednesday: '2025-06-12',
    thursday: '2025-06-13',
    friday: '2025-06-14',
    saturday: '2025-06-15',
    sunday: '2025-06-16',
  };
}

test.describe('시각적 회귀 테스트', () => {
  test.beforeAll(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test.beforeEach(async ({ page }) => {
    // 클라이언트 측 스토리지 초기화
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();

    const helpers = new E2EHelpers(page);
    await helpers.waitForPageLoad();
    await helpers.navigateToMonth(2025, 6);
  });

  test.afterEach(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test.describe('1. 타입에 따른 캘린더 뷰 렌더링', () => {
    test('월간 뷰가 올바르게 렌더링된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 월간 뷰로 전환
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 테스트용 일정 여러 개 생성
      await helpers.createEvent({
        title: '업무 회의',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '점심 약속',
        date: dates.tuesday,
        startTime: '12:00',
        endTime: '13:00',
        category: '개인',
      });

      await helpers.createEvent({
        title: '프로젝트 마감',
        date: dates.wednesday,
        startTime: '15:00',
        endTime: '17:00',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 월간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('month-view-calendar.png', {
        maxDiffPixels: 100,
      });
    });

    test('주간 뷰가 올바르게 렌더링된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 주간 뷰로 전환
      await helpers.changeView('week');
      await page.waitForTimeout(500);
      await page.locator('button[aria-label="Next"]').click();

      // 테스트용 일정 여러 개 생성
      await helpers.createEvent({
        title: '팀 스탠드업',
        date: dates.monday,
        startTime: '10:00',
        endTime: '10:30',
        category: '업무',
      });

      await helpers.createEvent({
        title: '클라이언트 미팅',
        date: dates.wednesday,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '저녁 운동',
        date: dates.friday,
        startTime: '18:00',
        endTime: '19:00',
        category: '개인',
      });

      await page.waitForTimeout(1000);

      // 주간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="week-view"]');
      await expect(calendarSection).toHaveScreenshot('week-view-calendar.png', {
        maxDiffPixels: 100,
      });
    });

    test('월간 뷰에서 주간 뷰로 전환이 올바르게 동작한다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 테스트용 일정 생성
      await helpers.createEvent({
        title: '뷰 전환 테스트',
        date: dates.thursday,
        startTime: '11:00',
        endTime: '12:00',
        category: '업무',
      });

      await page.waitForTimeout(500);

      // 월간 뷰 확인
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      const monthViewSection = page.locator('[data-testid="month-view"]');
      await expect(monthViewSection).toHaveScreenshot('view-transition-month.png', {
        maxDiffPixels: 100,
      });

      // 주간 뷰로 전환
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      const weekViewSection = page.locator('[data-testid="week-view"]');
      await expect(weekViewSection).toHaveScreenshot('view-transition-week.png', {
        maxDiffPixels: 100,
      });
    });

    test('빈 캘린더 뷰가 올바르게 렌더링된다 - 월간', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 월간 뷰로 전환
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 빈 월간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('empty-month-view.png', {
        maxDiffPixels: 100,
      });
    });

    test('빈 캘린더 뷰가 올바르게 렌더링된다 - 주간', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 주간 뷰로 전환
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      // 빈 주간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="week-view"]');
      await expect(calendarSection).toHaveScreenshot('empty-week-view.png', {
        maxDiffPixels: 100,
      });
    });

    test('여러 일정이 포함된 월간 뷰 렌더링', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 같은 날짜에 여러 일정 생성
      await helpers.createEvent({
        title: '아침 회의',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '점심 미팅',
        date: dates.monday,
        startTime: '12:00',
        endTime: '13:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '저녁 약속',
        date: dates.monday,
        startTime: '18:00',
        endTime: '19:00',
        category: '개인',
      });

      // 다른 날짜들에도 일정 추가
      await helpers.createEvent({
        title: '화요일 일정',
        date: dates.tuesday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '수요일 일정',
        date: dates.wednesday,
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });

      await page.waitForTimeout(1000);

      // 여러 일정이 포함된 월간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('month-view-multiple-events.png', {
        maxDiffPixels: 100,
      });
    });

    test('여러 일정이 포함된 주간 뷰 렌더링', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('week');
      await page.waitForTimeout(500);
      await page.locator('button[aria-label="Next"]').click();

      // 각 요일에 일정 생성
      await helpers.createEvent({
        title: '월요일 오전',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '월요일 오후',
        date: dates.monday,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 여러 일정이 포함된 주간 뷰 스크린샷
      const calendarSection = page.locator('[data-testid="week-view"]');
      await expect(calendarSection).toHaveScreenshot('week-view-multiple-events.png', {
        maxDiffPixels: 100,
      });
    });

    test('캘린더 네비게이션 버튼이 올바르게 렌더링된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 네비게이션 영역 스크린샷
      const navigationSection = page.locator('button[aria-label="Previous"]').locator('../..');
      await expect(navigationSection).toHaveScreenshot('calendar-navigation.png', {
        maxDiffPixels: 50,
      });
    });
  });

  test.describe('2. 일정 상태별 시각적 표현', () => {
    test('검색 필터링된 일정이 올바르게 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 여러 일정 생성
      await helpers.createEvent({
        title: '프로젝트 회의',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '점심 약속',
        date: dates.tuesday,
        startTime: '12:00',
        endTime: '13:00',
        category: '개인',
      });

      await helpers.createEvent({
        title: '프로젝트 검토',
        date: dates.wednesday,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      await page.waitForTimeout(500);

      // 검색 실행
      await helpers.searchEvent('프로젝트');
      await page.waitForTimeout(500);

      // 검색된 일정 목록 스크린샷
      const eventListSection = page.locator('[data-testid="event-list"]');
      await expect(eventListSection).toHaveScreenshot('filtered-events.png', {
        maxDiffPixels: 100,
      });
    });

    test('일정 상세 정보가 올바르게 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 상세 정보가 포함된 일정 생성
      await helpers.createEvent({
        title: '중요 회의',
        date: dates.monday,
        startTime: '14:00',
        endTime: '15:30',
        description: '분기별 성과 리뷰 회의',
        location: '본사 3층 회의실',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 일정 목록에서 확인
      const eventListSection = page.locator('[data-testid="event-list"]');
      await expect(eventListSection).toHaveScreenshot('event-details.png', {
        maxDiffPixels: 100,
      });
    });

    test('반복 일정이 올바르게 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '주간 스탠드업',
        date: dates.monday,
        startTime: '10:00',
        endTime: '10:30',
        category: '업무',
        repeatType: 'weekly',
        repeatInterval: 1,
        repeatEndDate: '2025-06-30',
      });

      await page.waitForTimeout(1000);

      // 반복 일정 표시 스크린샷
      const eventListSection = page.locator('[data-testid="event-list"]');
      await expect(eventListSection).toHaveScreenshot('recurring-event-display.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('3. 다이얼로그 및 모달', () => {
    test('반복 일정 수정 다이얼로그가 올바르게 렌더링된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '반복 일정',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
        repeatType: 'weekly',
        repeatInterval: 1,
        repeatEndDate: '2025-06-30',
      });

      await page.waitForTimeout(500);

      // 반복 일정 수정 시도
      const eventListItem = page
        .locator('div[data-testid="event-list"] > div[role="listitem"]')
        .filter({ hasText: '반복 일정' })
        .first();
      await eventListItem.locator('button[aria-label="Edit event"]').click();
      await page.waitForTimeout(500);

      // 반복 일정 수정 선택 다이얼로그 스크린샷

      const dialog = page
        .locator('div[role="presentation"]')
        .filter({ hasText: '반복 일정 수정' })
        .locator('..')
        .nth(0);

      if (await dialog.isVisible()) {
        await expect(dialog).toHaveScreenshot('recurring-edit-dialog.png', {
          maxDiffPixels: 100,
        });

        // 다이얼로그 닫기
        await page.keyboard.press('Escape');
      }
    });

    test('일정 겹침 경고 다이얼로그가 올바르게 렌더링된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 첫 번째 일정 생성
      await helpers.createEvent({
        title: '첫 번째 회의',
        date: dates.monday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await page.waitForTimeout(500);

      // 겹치는 시간대의 두 번째 일정 생성 시도
      await helpers.createEvent({
        title: '두 번째 회의',
        date: dates.monday,
        startTime: '10:30',
        endTime: '11:00',
        category: '업무',
      });

      await page.waitForTimeout(500);

      // 겹침 경고 다이얼로그 스크린샷
      const overlapDialog = page.locator('text=일정 겹침 경고').locator('..');
      if (await overlapDialog.isVisible()) {
        await expect(overlapDialog).toHaveScreenshot('overlap-warning-dialog.png', {
          maxDiffPixels: 100,
        });

        // 다이얼로그 닫기
        await page.locator('button:has-text("취소")').click();
      }
    });
  });

  test.describe('4. 폼 컨트롤 상태', () => {
    test('일정 추가 폼이 올바르게 렌더링된다', async ({ page }) => {
      await page.waitForTimeout(500);

      // 일정 추가 폼 스크린샷
      const formSection = page.locator('[data-testid="event-form"]');
      await expect(formSection).toHaveScreenshot('event-form-empty.png', {
        maxDiffPixels: 100,
      });
    });

    test('일정 추가 폼 입력 중 상태가 올바르게 표시된다', async ({ page }) => {
      const dates = getFixedTestDates();

      // 폼 입력
      await page.locator('text=제목').fill('새로운 회의');
      await page.locator('input[type="date"]').fill(dates.monday);

      const timeInputs = await page.locator('input[type="time"]').all();
      await timeInputs[0].fill('10:00');
      await timeInputs[1].fill('11:00');

      await page.locator('input#description').fill('중요한 회의입니다');
      await page.locator('input#location').fill('회의실 A');

      await page.waitForTimeout(500);

      // 입력 중인 폼 스크린샷
      const formSection = page.locator('[data-testid="event-form"]');
      await expect(formSection).toHaveScreenshot('event-form-filled.png', {
        maxDiffPixels: 100,
      });
    });

    test('반복 설정이 활성화된 폼이 올바르게 렌더링된다', async ({ page }) => {
      const dates = getFixedTestDates();

      // 기본 정보 입력
      await page.locator('text=제목').fill('주간 회의');
      await page.locator('input[type="date"]').fill(dates.monday);

      // 반복 일정 체크박스 클릭
      const repeatCheckbox = page.locator('text=반복 일정');
      await repeatCheckbox.click();
      await page.waitForTimeout(500);

      // 반복 설정이 표시된 폼 스크린샷
      const formSection = page.locator('[data-testid="event-form"]');
      await expect(formSection).toHaveScreenshot('event-form-repeat-enabled.png', {
        maxDiffPixels: 100,
      });
    });

    test('시간 입력 에러 상태가 올바르게 표시된다', async ({ page }) => {
      const dates = getFixedTestDates();

      // 기본 정보 입력
      await page.locator('text=제목').fill('에러 테스트');
      await page.locator('input[type="date"]').fill(dates.monday);

      // 잘못된 시간 입력 (종료 시간이 시작 시간보다 이른 경우)
      const timeInputs = await page.locator('input[type="time"]').all();
      await timeInputs[0].fill('14:00');
      await timeInputs[1].fill('10:00');

      // 다른 필드 클릭하여 validation 트리거
      await page.locator('input#description').click();
      await page.waitForTimeout(500);

      // 에러 상태의 폼 스크린샷
      const formSection = page.locator('[data-testid="event-form"]');
      await expect(formSection).toHaveScreenshot('event-form-time-error.png', {
        maxDiffPixels: 100,
      });
    });
  });

  test.describe('5. 각 셀 텍스트 길이에 따른 처리', () => {
    test('짧은 제목의 일정이 올바르게 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('month');
      await page.waitForTimeout(500);

      await helpers.createEvent({
        title: '회의',
        date: dates.monday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 짧은 제목 일정 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('event-short-title.png', {
        maxDiffPixels: 100,
      });
    });

    test('긴 제목의 일정이 올바르게 잘려서 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('month');
      await page.waitForTimeout(500);

      await helpers.createEvent({
        title: '매우 긴 제목을 가진 중요한 프로젝트 킥오프 미팅 및 전략 수립 회의',
        date: dates.monday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 긴 제목 일정 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('event-long-title.png', {
        maxDiffPixels: 100,
      });
    });

    test('여러 개의 긴 제목 일정이 함께 표시될 때 처리', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 같은 날에 여러 긴 제목 일정 생성
      await helpers.createEvent({
        title: '첫 번째 매우 긴 제목의 중요한 회의입니다',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '두 번째 아주 긴 제목을 가진 프로젝트 리뷰 미팅',
        date: dates.monday,
        startTime: '11:00',
        endTime: '12:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '세 번째 길고 상세한 설명이 필요한 중요 일정',
        date: dates.monday,
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });

      await page.waitForTimeout(1000);

      // 여러 긴 제목 일정 스크린샷
      const calendarSection = page.locator('[data-testid="month-view"]');
      await expect(calendarSection).toHaveScreenshot('multiple-long-titles.png', {
        maxDiffPixels: 100,
      });
    });

    test('주간 뷰에서 긴 제목 처리', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.changeView('week');
      await page.waitForTimeout(500);
      await page.locator('button[aria-label="Next"]').click();

      await helpers.createEvent({
        title: '주간 뷰에서 표시될 매우 긴 제목의 일정입니다',
        date: dates.monday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await page.waitForTimeout(1000);

      // 주간 뷰의 긴 제목 일정 스크린샷
      const calendarSection = page.locator('[data-testid="week-view"]');
      await expect(calendarSection).toHaveScreenshot('week-view-long-title.png', {
        maxDiffPixels: 100,
      });
    });
  });
});
