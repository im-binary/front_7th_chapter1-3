import { E2EHelpers } from './E2EHelpers';
import { expect, test } from './fixtures';

// 테스트 설정
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
    day8: '2025-06-17',
    day9: '2025-06-18',
    day10: '2025-06-19',
    day11: '2025-06-20',
    day12: '2025-06-21',
  };
}

test.describe('기본 일정 관리 워크플로우', () => {
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

  test.describe('1. 애플리케이션 초기화 및 기본 UI', () => {
    test('페이지 접속 시 캘린더가 정상적으로 로드된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();

      // 캘린더 뷰 제목 확인
      await expect(page.locator('text=일정 보기')).toBeVisible();

      // 기본 UI 요소들 존재 확인
      await expect(page.locator('button:has-text("일정 추가")')).toBeVisible();
      await expect(page.locator('text=제목')).toBeVisible();
      await expect(page.locator('button[aria-label="Previous"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Next"]')).toBeVisible();
    });

    test('월간/주간 뷰 전환이 가능하다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();

      // 뷰 선택 드롭다운 확인
      const viewSelect = page.locator('div[aria-label="뷰 타입 선택"]');
      await expect(viewSelect).toBeVisible();

      // 주간 뷰로 전환
      await helpers.changeView('week');
      await expect(viewSelect).toContainText('Week');

      // 월간 뷰로 전환
      await helpers.changeView('month');
      await expect(viewSelect).toContainText('Month');
    });

    test('캘린더 이전/다음 네비게이션이 작동한다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();

      // 네비게이션 버튼 확인
      await expect(page.locator('button[aria-label="Previous"]')).toBeVisible();
      await expect(page.locator('button[aria-label="Next"]')).toBeVisible();

      // 다음으로 이동
      await helpers.navigateCalendar('next');
      await page.waitForTimeout(300);

      // 이전으로 이동
      await helpers.navigateCalendar('prev');
      await page.waitForTimeout(300);

      // 버튼이 계속 작동하는지 확인
      await expect(page.locator('button[aria-label="Next"]')).toBeEnabled();
      await expect(page.locator('button[aria-label="Previous"]')).toBeEnabled();
    });
  });

  test.describe('2. Create - 일정 생성', () => {
    test('일정 추가 폼이 정상적으로 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      await helpers.waitForPageLoad();

      // 일정 추가 폼 확인
      await expect(page.locator('text=제목')).toBeVisible();
      await expect(page.locator('input[type="date"]')).toBeVisible();
      await expect(page.locator('input[type="time"]').first()).toBeVisible();
      await expect(page.locator('button:has-text("일정 추가")')).toBeVisible();
    });

    test('새로운 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 일정 생성 - 6월 12일(수요일)에 일정 생성
      await helpers.createEvent({
        title: '팀 회의',
        date: dates.wednesday,
        startTime: '10:00',
        endTime: '11:00',
        description: '주간 팀 회의',
        location: '회의실 A',
        category: '업무',
      });

      // 일정이 생성되고 표시되는지 확인
      await page.waitForTimeout(1000);
      expect(await helpers.findEventCard('팀 회의')).toBeVisible();
      expect(await helpers.findEventListItem('팀 회의')).toBeVisible();
    });

    test('여러 개의 일정을 생성할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 첫 번째 일정 생성 - 6월 10일(월요일)
      await helpers.createEvent({
        title: '프로젝트 미팅',
        date: dates.monday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      // 두 번째 일정 생성 - 같은 날(월요일)
      await helpers.createEvent({
        title: '점심 약속',
        date: dates.monday,
        startTime: '12:00',
        endTime: '13:00',
        category: '개인',
      });

      // 세 번째 일정 생성 - 화요일
      await helpers.createEvent({
        title: '운동',
        date: dates.tuesday,
        startTime: '18:00',
        endTime: '19:00',
        category: '개인',
      });

      // 모든 일정이 현재 주 캘린더에 표시되는지 확인
      await expect(helpers.getEventLocator('프로젝트 미팅')).toHaveCount(2);
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(2);
      await expect(helpers.getEventLocator('운동')).toHaveCount(2);
    });
  });

  test.describe('3. Read - 일정 조회', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 테스트용 일정 생성
      await helpers.createEvent({
        title: '조회 테스트 일정',
        date: dates.monday,
        startTime: '10:00',
        endTime: '11:00',
        description: '조회 테스트용 일정입니다',
        location: '테스트 장소',
        category: '업무',
      });
    });

    test('생성된 일정이 캘린더와 리스트에 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await expect(helpers.getEventLocator('조회 테스트 일정')).toHaveCount(2);
    });

    test('일정 검색 기능이 작동한다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 추가 일정 생성
      await helpers.createEvent({
        title: '다른 일정',
        date: dates.tuesday,
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });

      // 검색어 입력
      await helpers.searchEvent('조회 테스트 일정');

      // 검색 결과가 캘린더와 리스트 양쪽에 표시되는지 확인 (2곳)
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('조회 테스트 일정')).toHaveCount(2);
    });

    test('일정 목록이 올바르게 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 추가 일정 생성
      await helpers.createEvent({
        title: '목록 테스트 일정 1',
        date: dates.wednesday,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '목록 테스트 일정 2',
        date: dates.wednesday,
        startTime: '11:00',
        endTime: '12:00',
        category: '개인',
      });

      // 모든 일정이 캘린더와 리스트 양쪽에 표시되는지 확인 (각각 2곳)
      await expect(helpers.getEventLocator('조회 테스트 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('목록 테스트 일정 1')).toHaveCount(2);
      await expect(helpers.getEventLocator('목록 테스트 일정 2')).toHaveCount(2);
    });
  });

  test.describe('4. Update - 일정 수정', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 수정할 테스트용 일정 생성
      await helpers.createEvent({
        title: '수정 전 일정',
        date: dates.thursday,
        startTime: '10:00',
        endTime: '11:00',
        description: '수정 전 설명',
        location: '수정 전 장소',
        category: '업무',
      });
    });

    test('일정 제목을 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await expect(helpers.getEventLocator('수정 전 일정')).toHaveCount(2);

      // 일정 수정
      await helpers.updateEvent('수정 전 일정', {
        title: '수정 후 일정',
      });

      expect(await helpers.findEventListItem('수정 후 일정')).toBeVisible();
      // 수정된 제목이 캘린더와 리스트 양쪽에 표시되는지 확인 (2곳)
      await expect(helpers.getEventLocator('수정 후 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('수정 전 일정')).toHaveCount(0);
    });

    test('일정 시간을 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 일정 수정
      await helpers.updateEvent('수정 전 일정', {
        startTime: '14:00',
        endTime: '16:00',
      });

      const listItem = await helpers.findEventListItem('수정 전 일정');

      await expect(listItem).toContainText('14:00 - 16:00');
    });

    test('일정 날짜를 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.searchEvent('수정 전 일정');

      // 일정 수정
      await helpers.updateEvent('수정 전 일정', {
        date: dates.day10,
      });

      // 일정이 캘린더와 리스트 양쪽에 계속 표시되는지 확인 (2곳)
      await expect(helpers.getEventLocator('수정 전 일정')).toHaveCount(2);

      const listItem = await helpers.findEventListItem('수정 전 일정');

      await expect(listItem).toContainText(dates.day10);
    });

    test('일정 카테고리를 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 일정 수정
      await helpers.updateEvent('수정 전 일정', {
        category: '개인',
      });

      // 수정 완료 대기 후 다시 확인
      const listItem = await helpers.findEventListItem('수정 전 일정');

      await expect(listItem).toContainText('카테고리: 개인');
    });

    test('일정 수정 시 목록이 업데이트된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      await helpers.updateEvent('수정 전 일정', {
        title: '알림 확인용 일정',
      });

      // 수정된 제목이 캘린더와 리스트 양쪽에 표시되는지 확인 (2곳)
      await page.waitForTimeout(1000);
      await expect(helpers.getEventLocator('알림 확인용 일정')).toHaveCount(2);
    });

    test('여러 필드를 동시에 수정할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 여러 필드 동시 수정
      await helpers.updateEvent('수정 전 일정', {
        title: '완전히 새로운 일정',
        date: dates.friday,
        startTime: '15:00',
        endTime: '17:00',
        description: '수정 후 설명',
        location: '수정 후 장소',
        category: '개인',
      });

      // 수정된 일정이 캘린더와 리스트 양쪽에 표시되는지 확인 (2곳)
      await expect(helpers.getEventLocator('완전히 새로운 일정')).toHaveCount(2);

      await helpers.clickEventEdit('완전히 새로운 일정');
      await expect(page.locator('input[value*="완전히 새로운 일정"]')).toBeVisible();

      const timeInputs = await page.locator('input[type="time"]').all();
      await expect(timeInputs[0]).toHaveValue('15:00');
      await expect(timeInputs[1]).toHaveValue('17:00');
    });
  });

  test.describe('5. Delete - 일정 삭제', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 삭제할 테스트용 일정 생성
      await helpers.createEvent({
        title: '삭제할 일정',
        date: dates.saturday,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });
    });

    test('일정을 삭제할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 삭제 전 캘린더와 리스트 양쪽에 표시되는지 확인 (2곳)
      await expect(helpers.getEventLocator('삭제할 일정')).toHaveCount(2);

      // 일정 삭제
      await helpers.deleteEvent('삭제할 일정');

      // 삭제 후 어디에도 표시되지 않는지 확인 (0곳)
      await expect(helpers.getEventLocator('삭제할 일정')).toHaveCount(0);
    });

    test('여러 일정을 순차적으로 삭제할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 추가 일정 생성
      await helpers.createEvent({
        title: '삭제할 2 일정',
        date: dates.saturday,
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });

      await helpers.createEvent({
        title: '삭제할 3 일정',
        date: dates.saturday,
        startTime: '16:00',
        endTime: '17:00',
        category: '개인',
      });

      // 첫 번째 일정 삭제
      await helpers.deleteEvent('삭제할 일정');
      await expect(helpers.getEventLocator('삭제할 일정')).toHaveCount(0);

      // 두 번째 일정 삭제
      await helpers.deleteEvent('삭제할 2 일정');
      await expect(helpers.getEventLocator('삭제할 2 일정')).toHaveCount(0);

      // 세 번째 일정은 여전히 캘린더와 리스트에 존재 (2곳)
      await expect(helpers.getEventLocator('삭제할 3 일정')).toHaveCount(2);

      // 세 번째 일정 삭제
      await helpers.deleteEvent('삭제할 3 일정');
      await expect(helpers.getEventLocator('삭제할 3 일정')).toHaveCount(0);
    });
  });

  test.describe('6. CRUD 통합 워크플로우', () => {
    test('일정 생성 → 조회 → 수정 → 삭제 전체 플로우', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 1. Create - 일정 생성
      await helpers.createEvent({
        title: '통합 테스트 일정',
        date: dates.sunday,
        startTime: '10:00',
        endTime: '11:00',
        description: 'CRUD 통합 테스트',
        location: '테스트 룸',
        category: '업무',
      });

      // 생성 확인
      await expect(helpers.getEventLocator('통합 테스트 일정')).toHaveCount(2);

      // 2. Read - 일정 조회
      const listItem = await helpers.findEventListItem('통합 테스트 일정');
      await expect(listItem).toContainText(dates.sunday);
      await expect(listItem).toContainText('10:00 - 11:00');
      await expect(listItem).toContainText('CRUD 통합 테스트');
      await expect(listItem).toContainText('테스트 룸');
      await expect(listItem).toContainText('카테고리: 업무');

      // 3. Update - 일정 수정
      await helpers.updateEvent('통합 테스트 일정', {
        title: '수정된 통합 테스트 일정',
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });

      // 수정 확인
      await expect(helpers.getEventLocator('수정된 통합 테스트 일정')).toHaveCount(2);
      const updatedListItem = await helpers.findEventListItem('수정된 통합 테스트 일정');
      await expect(updatedListItem).toContainText(dates.sunday);
      await expect(updatedListItem).toContainText('14:00 - 15:00');
      await expect(updatedListItem).toContainText('CRUD 통합 테스트');
      await expect(updatedListItem).toContainText('테스트 룸');
      await expect(updatedListItem).toContainText('카테고리: 개인');

      // 4. Delete - 일정 삭제
      await helpers.deleteEvent('수정된 통합 테스트 일정');

      // 삭제 확인
      await expect(helpers.getEventLocator('수정된 통합 테스트 일정')).not.toBeVisible();
    });
  });
});
