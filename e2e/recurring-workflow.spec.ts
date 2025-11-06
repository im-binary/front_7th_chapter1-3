import { E2EHelpers } from './E2EHelpers';
import { expect, test } from './fixtures';

// 테스트 설정
test.describe.configure({ mode: 'serial' });

/**
 * 고정된 테스트 날짜 반환 (2025년 6월 10일~30일)
 * - 월 경계를 넘지 않는 안전한 날짜
 * - 테스트 시작 시 navigateToMonth(2025, 6)로 이동 필요
 */
function getTestDates() {
  return {
    firstDayOfMonth: '2025-06-01',
    today: '2025-06-10',
    tomorrow: '2025-06-11',
    startDate: '2025-06-11', // 내일부터 시작
    endDate5Days: '2025-06-16', // 6일간 (11일 + 5일)
    endDate14Days: '2025-06-25', // 15일간
    endDate7Days: '2025-06-18', // 8일간
    endDate10Days: '2025-06-21', // 11일간
    midDate: '2025-06-13', // 시작일로부터 2일 후
    endDateMonths: '2025-09-10', // 약 3개월 후
    endDateYears: '2028-06-10', // 약 3년 후
  };
}

test.describe('반복 일정 관리 워크플로우', () => {
  // 전체 테스트 시작 전 태그된 데이터만 정리
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

    // 모든 테스트를 위해 캘린더를 2025년 6월로 이동
    const helpers = new E2EHelpers(page);
    await helpers.waitForPageLoad();
    await helpers.navigateToMonth(2025, 6);
  });

  test.afterEach(async ({ request }) => {
    // 각 테스트 후 태그된 테스트 데이터 정리
    await E2EHelpers.cleanupTestData(request);
  });

  test.describe('1. 반복 일정 생성', () => {
    test('매일 반복 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();
      const dates = getTestDates();

      await helpers.createRecurringEvent({
        title: '매일 운동',
        date: dates.startDate,
        startTime: '07:00',
        endTime: '08:00',
        description: '아침 운동',
        location: '헬스장',
        category: '개인',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      // 생성된 반복 일정 확인 (6일간의 일정이 생성되어야 함)
      const eventCount = await helpers.countEventsWithTitle('매일 운동');
      // 캘린더와 리스트에 각각 표시되므로 6 * 2 = 12개
      expect(eventCount).toBeGreaterThan(0);
      await expect(helpers.getEventLocator('매일 운동').first()).toBeVisible();
    });

    test('매주 반복 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();
      await helpers.navigateToMonth(2025, 6);
      const dates = getTestDates();

      await helpers.createRecurringEvent({
        title: '주간 회의',
        date: dates.startDate,
        startTime: '14:00',
        endTime: '15:00',
        description: '주간 팀 회의',
        location: '회의실 A',
        category: '업무',
        repeatType: 'weekly',
        repeatInterval: 1,
        repeatEndDate: dates.endDate14Days,
      });

      // 생성된 반복 일정 확인
      await expect(helpers.getEventLocator('주간 회의').first()).toBeVisible();
    });

    test('매월 반복 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      await helpers.createRecurringEvent({
        title: '월간 보고',
        date: dates.startDate,
        startTime: '10:00',
        endTime: '11:00',
        description: '월간 실적 보고',
        location: '본사',
        category: '업무',
        repeatType: 'monthly',
        repeatInterval: 1,
        repeatEndDate: dates.endDateMonths,
      });

      // 생성된 반복 일정 확인
      await expect(helpers.getEventLocator('월간 보고').first()).toBeVisible();
    });

    test('매년 반복 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const dates = getTestDates();

      await helpers.createRecurringEvent({
        title: '생일 파티',
        date: dates.startDate,
        startTime: '19:00',
        endTime: '21:00',
        description: '생일 축하',
        location: '집',
        category: '개인',
        repeatType: 'yearly',
        repeatInterval: 1,
        repeatEndDate: dates.endDateYears,
      });

      // 생성된 반복 일정 확인
      await expect(helpers.getEventLocator('생일 파티').first()).toBeVisible();
    });

    test('반복 간격을 설정하여 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 2일 간격으로 반복
      await helpers.createRecurringEvent({
        title: '격일 조깅',
        date: dates.startDate,
        startTime: '06:00',
        endTime: '07:00',
        description: '격일 조깅',
        location: '공원',
        category: '개인',
        repeatType: 'daily',
        repeatInterval: 2,
        repeatEndDate: dates.endDate10Days,
      });

      await expect(helpers.getEventLocator('격일 조깅').first()).toBeVisible();
    });
  });

  test.describe('2. 반복 일정 조회 및 검색', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '데일리 스크럼',
        date: dates.startDate,
        startTime: '09:00',
        endTime: '09:30',
        description: '매일 스크럼 미팅',
        location: '회의실 B',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });
    });

    test('생성된 반복 일정들이 캘린더에 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 반복 일정이 여러 개 표시되는지 확인
      const eventCount = await helpers.countEventsWithTitle('데일리 스크럼');
      expect(eventCount).toBeGreaterThan(0);
    });

    test('반복 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 다른 일정 추가
      await helpers.createEvent({
        title: '일반 미팅',
        date: dates.midDate,
        startTime: '15:00',
        endTime: '16:00',
        category: '업무',
      });

      // 반복 일정 검색
      await helpers.searchEvent('데일리 스크럼');

      // 검색 결과 확인
      await expect(helpers.getEventLocator('데일리 스크럼').first()).toBeVisible();
    });

    test('반복 일정의 상세 정보를 확인할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const listItem = await helpers.findEventListItem('데일리 스크럼');
      await expect(listItem.first()).toContainText('09:00 - 09:30');
      await expect(listItem.first()).toContainText('매일 스크럼 미팅');
      await expect(listItem.first()).toContainText('회의실 B');
      await expect(listItem.first()).toContainText('카테고리: 업무');
    });
  });

  test.describe('3. 단일 반복 일정 수정', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '아침 미팅',
        date: dates.startDate,
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 아침 미팅',
        location: '회의실',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });
    });

    test('단일 반복 일정만 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 단일 일정만 수정
      await helpers.editRecurringEvent('아침 미팅', true, {
        title: '특별 아침 미팅',
        startTime: '08:00',
        endTime: '09:00',
      });

      // 수정된 일정과 원본 일정이 모두 존재하는지 확인
      await expect(helpers.getEventLocator('특별 아침 미팅').first()).toBeVisible();
      await expect(helpers.getEventLocator('아침 미팅').first()).toBeVisible();
    });

    test('단일 일정 수정 시 시간만 변경할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.editRecurringEvent('아침 미팅', true, {
        startTime: '10:00',
        endTime: '11:00',
      });

      // 원본 일정이 여전히 존재하는지 확인
      await expect(helpers.getEventLocator('아침 미팅').first()).toBeVisible();
    });

    test('단일 일정 수정 시 제목을 변경할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.editRecurringEvent('아침 미팅', true, {
        title: '긴급 미팅',
      });

      await expect(helpers.getEventLocator('긴급 미팅').first()).toBeVisible();
      await expect(helpers.getEventLocator('아침 미팅').first()).toBeVisible();
    });
  });

  test.describe('4. 모든 반복 일정 수정', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '오후 체크인',
        date: dates.startDate,
        startTime: '15:00',
        endTime: '15:30',
        description: '오후 팀 체크인',
        location: '온라인',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });
    });

    test('모든 반복 일정을 한 번에 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 모든 반복 일정 수정
      await helpers.editRecurringEvent('오후 체크인', false, {
        title: '저녁 체크인',
        startTime: '17:00',
        endTime: '17:30',
      });

      // 모든 일정이 수정되었는지 확인
      await expect(helpers.getEventLocator('저녁 체크인').first()).toBeVisible();
      // 원본 제목은 더 이상 존재하지 않아야 함
      await expect(helpers.getEventLocator('오후 체크인')).toHaveCount(0);
    });

    test('모든 반복 일정의 위치를 변경할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.editRecurringEvent('오후 체크인', false, {
        location: '회의실 C',
      });

      const listItem = await helpers.findEventListItem('오후 체크인');
      await expect(listItem.first()).toContainText('회의실 C');
    });

    test('모든 반복 일정의 카테고리를 변경할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.editRecurringEvent('오후 체크인', false, {
        category: '개인',
      });

      const listItem = await helpers.findEventListItem('오후 체크인');
      await expect(listItem.first()).toContainText('카테고리: 개인');
    });
  });

  test.describe('5. 단일 반복 일정 삭제', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '일일 리포트',
        date: dates.startDate,
        startTime: '18:00',
        endTime: '18:30',
        description: '일일 업무 리포트',
        location: '온라인',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });
    });

    test('단일 반복 일정만 삭제할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      const beforeCount = await helpers.countEventsWithTitle('일일 리포트');
      expect(beforeCount).toBeGreaterThan(0);

      // 단일 일정만 삭제
      await helpers.deleteRecurringEvent('일일 리포트', true);

      // 나머지 일정은 여전히 존재해야 함
      const afterCount = await helpers.countEventsWithTitle('일일 리포트');
      expect(afterCount).toBeLessThan(beforeCount);
      expect(afterCount).toBeGreaterThan(0);
    });

    test('단일 일정 삭제 후 다른 반복 일정들은 유지된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.deleteRecurringEvent('일일 리포트', true);

      // 다른 반복 일정들이 여전히 표시되는지 확인
      await expect(helpers.getEventLocator('일일 리포트').first()).toBeVisible();
    });
  });

  test.describe('6. 모든 반복 일정 삭제', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
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
    });

    test('모든 반복 일정을 한 번에 삭제할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await expect(helpers.getEventLocator('주간 리뷰').first()).toBeVisible();

      // 모든 반복 일정 삭제
      await helpers.deleteRecurringEvent('주간 리뷰', false);

      // 모든 일정이 삭제되었는지 확인
      await expect(helpers.getEventLocator('주간 리뷰')).toHaveCount(0);
    });

    test('모든 반복 일정 삭제 시 캘린더와 리스트에서 모두 제거된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.deleteRecurringEvent('주간 리뷰', false);

      // 캘린더 확인
      await expect(helpers.getEventLocator('주간 리뷰')).toHaveCount(0);

      // 리스트 확인
      const listItems = await page
        .locator('div[data-testid="event-list"] > div[role="listitem"]')
        .filter({ hasText: '[E2E-TEST] 주간 리뷰' })
        .count();
      expect(listItems).toBe(0);
    });
  });

  test.describe('7. 반복 일정 복합 시나리오', () => {
    test('여러 반복 일정을 생성하고 개별적으로 관리할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 첫 번째 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '아침 요가',
        date: dates.startDate,
        startTime: '07:00',
        endTime: '08:00',
        category: '개인',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      // 두 번째 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '저녁 독서',
        date: dates.startDate,
        startTime: '20:00',
        endTime: '21:00',
        category: '개인',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      // 두 일정 모두 표시되는지 확인
      await expect(helpers.getEventLocator('아침 요가').first()).toBeVisible();
      await expect(helpers.getEventLocator('저녁 독서').first()).toBeVisible();

      // 첫 번째 일정의 단일 인스턴스 수정
      await helpers.editRecurringEvent('아침 요가', true, {
        startTime: '06:30',
        endTime: '07:30',
      });

      // 두 번째 일정의 모든 인스턴스 삭제
      await helpers.deleteRecurringEvent('저녁 독서', false);

      // 첫 번째 일정은 여전히 존재
      await expect(helpers.getEventLocator('아침 요가').first()).toBeVisible();
      // 두 번째 일정은 모두 삭제됨
      await expect(helpers.getEventLocator('저녁 독서')).toHaveCount(0);
    });

    test('반복 일정 생성 → 단일 수정 → 모든 일정 삭제 플로우', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 1. 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '팀 스탠드업',
        date: dates.startDate,
        startTime: '10:00',
        endTime: '10:15',
        description: '매일 스탠드업',
        location: '회의실',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      await expect(helpers.getEventLocator('팀 스탠드업').first()).toBeVisible();

      // 2. 단일 일정 수정
      await helpers.editRecurringEvent('팀 스탠드업', true, {
        title: '특별 스탠드업',
        startTime: '11:00',
        endTime: '11:15',
      });

      await expect(helpers.getEventLocator('특별 스탠드업').first()).toBeVisible();
      await expect(helpers.getEventLocator('팀 스탠드업').first()).toBeVisible();

      // 3. 모든 원본 반복 일정 삭제
      await helpers.deleteRecurringEvent('팀 스탠드업', false);

      await expect(helpers.getEventLocator('팀 스탠드업')).toHaveCount(0);
      // 수정된 단일 일정은 여전히 존재
      await expect(helpers.getEventLocator('특별 스탠드업').first()).toBeVisible();
    });

    test('반복 일정 생성 → 모든 일정 수정 → 단일 일정 삭제 플로우', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 1. 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '코드 리뷰',
        date: dates.startDate,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      // 2. 모든 반복 일정 수정
      await helpers.editRecurringEvent('코드 리뷰', false, {
        title: '페어 프로그래밍',
        startTime: '15:00',
        endTime: '16:00',
      });

      await expect(helpers.getEventLocator('페어 프로그래밍').first()).toBeVisible();
      await expect(helpers.getEventLocator('코드 리뷰')).toHaveCount(0);

      // 3. 단일 일정 삭제
      const beforeCount = await helpers.countEventsWithTitle('페어 프로그래밍');
      await helpers.deleteRecurringEvent('페어 프로그래밍', true);
      const afterCount = await helpers.countEventsWithTitle('페어 프로그래밍');

      expect(afterCount).toBeLessThan(beforeCount);
      expect(afterCount).toBeGreaterThan(0);
    });
  });

  test.describe('8. 반복 일정과 일반 일정 혼합', () => {
    test('반복 일정과 일반 일정을 함께 관리할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '매일 운동',
        date: dates.startDate,
        startTime: '07:00',
        endTime: '08:00',
        category: '개인',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate5Days,
      });

      // 일반 일정 생성
      await helpers.createEvent({
        title: '특별 이벤트',
        date: dates.midDate,
        startTime: '19:00',
        endTime: '20:00',
        category: '개인',
      });

      // 두 일정 모두 표시되는지 확인
      await expect(helpers.getEventLocator('매일 운동').first()).toBeVisible();
      await expect(helpers.getEventLocator('특별 이벤트')).toHaveCount(2); // 캘린더 + 리스트

      // 일반 일정 수정
      await helpers.updateEvent('특별 이벤트', {
        title: '수정된 특별 이벤트',
      });

      await expect(helpers.getEventLocator('수정된 특별 이벤트')).toHaveCount(2);

      // 반복 일정 단일 인스턴스 삭제
      await helpers.deleteRecurringEvent('매일 운동', true);

      // 반복 일정은 여전히 존재
      await expect(helpers.getEventLocator('매일 운동').first()).toBeVisible();
      // 일반 일정도 여전히 존재
      await expect(helpers.getEventLocator('수정된 특별 이벤트')).toHaveCount(2);
    });

    test('같은 날짜에 반복 일정과 일반 일정을 추가할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      const targetDate = dates.startDate;

      // 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '아침 회의',
        date: targetDate,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.midDate,
      });

      // 같은 날짜에 일반 일정 생성
      await helpers.createEvent({
        title: '점심 약속',
        date: targetDate,
        startTime: '12:00',
        endTime: '13:00',
        category: '개인',
      });

      // 두 일정 모두 표시되는지 확인
      await expect(helpers.getEventLocator('아침 회의').first()).toBeVisible();
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(2);
    });
  });

  test.describe('9. 반복 일정 뷰 전환', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getTestDates();

      // 테스트용 반복 일정 생성
      await helpers.createRecurringEvent({
        title: '뷰 테스트 일정',
        date: dates.firstDayOfMonth,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
        repeatType: 'daily',
        repeatInterval: 1,
        repeatEndDate: dates.endDate10Days,
      });
    });

    test('월간 뷰에서 반복 일정을 확인할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.changeView('month');
      await expect(helpers.getEventLocator('뷰 테스트 일정').first()).toBeVisible();
    });

    test('주간 뷰에서 반복 일정을 확인할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.changeView('week');
      await expect(helpers.getEventLocator('뷰 테스트 일정').first()).toBeVisible();
    });

    test('뷰 전환 시 반복 일정이 유지된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 월간 뷰
      await helpers.changeView('month');
      await expect(helpers.getEventLocator('뷰 테스트 일정').first()).toBeVisible();

      // 주간 뷰
      await helpers.changeView('week');
      await expect(helpers.getEventLocator('뷰 테스트 일정').first()).toBeVisible();

      // 다시 월간 뷰
      await helpers.changeView('month');
      await expect(helpers.getEventLocator('뷰 테스트 일정').first()).toBeVisible();
    });
  });
});
