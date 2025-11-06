import { E2EHelpers } from './E2EHelpers';
import { expect, test } from './fixtures';

// 테스트 설정
test.describe.configure({ mode: 'serial' });

/**
 * 고정된 테스트 날짜 반환 (2025년 7월)
 * - 검색 및 필터링 테스트를 위한 날짜 범위
 */
function getFixedTestDates() {
  return {
    // 7월 첫째 주 (6월 30일 ~ 7월 6일)
    week1Day1: '2025-06-30', // 월
    week1Day2: '2025-07-01', // 화
    week1Day3: '2025-07-02', // 수
    week1Day4: '2025-07-03', // 목
    week1Day5: '2025-07-04', // 금
    week1Day6: '2025-07-05', // 토
    week1Day7: '2025-07-06', // 일

    // 7월 둘째 주 (7월 7일 ~ 7월 13일)
    week2Day1: '2025-07-07', // 월
    week2Day2: '2025-07-08', // 화
    week2Day3: '2025-07-09', // 수
    week2Day4: '2025-07-10', // 목
    week2Day5: '2025-07-11', // 금
    week2Day6: '2025-07-12', // 토
    week2Day7: '2025-07-13', // 일

    // 7월 셋째 주 (7월 14일 ~ 7월 20일)
    week3Day1: '2025-07-14', // 월
    week3Day2: '2025-07-15', // 화
    week3Day3: '2025-07-16', // 수
    week3Day4: '2025-07-17', // 목
    week3Day5: '2025-07-18', // 금
    week3Day6: '2025-07-19', // 토
    week3Day7: '2025-07-20', // 일

    // 8월 (다른 달)
    nextMonth: '2025-08-01', // 금
  };
}

test.describe('검색 및 필터링 전반 검증', () => {
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
    await helpers.navigateToMonth(2025, 7);
  });

  test.afterEach(async ({ request }) => {
    await E2EHelpers.cleanupTestData(request);
  });

  test.describe('1. 기본 검색 기능', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 테스트용 일정들 생성
      await helpers.createEvent({
        title: '팀 회의',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        description: '주간 스프린트 회의',
        location: '회의실 A',
        category: '업무',
      });

      await helpers.createEvent({
        title: '점심 약속',
        date: dates.week1Day3,
        startTime: '12:00',
        endTime: '13:00',
        description: '친구와 점심',
        location: '강남역 레스토랑',
        category: '개인',
      });

      await helpers.createEvent({
        title: '프로젝트 발표',
        date: dates.week1Day5,
        startTime: '14:00',
        endTime: '16:00',
        description: '최종 프로젝트 발표회',
        location: '대강당',
        category: '업무',
      });

      await helpers.createEvent({
        title: '운동',
        date: dates.week2Day1,
        startTime: '18:00',
        endTime: '19:00',
        description: '헬스장 PT',
        location: '피트니스센터',
        category: '개인',
      });
    });

    test('제목으로 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '회의'로 검색
      await helpers.searchEvent('회의');
      await page.waitForTimeout(500);

      // '팀 회의'만 표시되어야 함 (캘린더 + 리스트 = 2개)
      await expect(helpers.getEventLocator('팀 회의')).toHaveCount(2);
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(0);
      await expect(helpers.getEventLocator('프로젝트 발표')).toHaveCount(0);
      await expect(helpers.getEventLocator('운동')).toHaveCount(0);
    });

    test('설명으로 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '프로젝트'로 검색 (설명에 포함)
      await helpers.searchEvent('프로젝트');
      await page.waitForTimeout(500);

      // '프로젝트 발표'만 표시되어야 함
      expect(await helpers.findEventCard('프로젝트 발표')).toBeVisible();
      expect(await helpers.findEventListItem('프로젝트 발표')).toBeVisible();
      await expect(helpers.getEventLocator('팀 회의')).toHaveCount(0);
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(0);
      await expect(helpers.getEventLocator('운동')).toHaveCount(0);
    });

    test('위치로 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '강남'으로 검색 (위치에 포함)
      await helpers.searchEvent('강남');
      await page.waitForTimeout(500);

      // '점심 약속'만 표시되어야 함
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(2);
      await expect(helpers.getEventLocator('팀 회의')).toHaveCount(0);
      await expect(helpers.getEventLocator('프로젝트 발표')).toHaveCount(0);
      await expect(helpers.getEventLocator('운동')).toHaveCount(0);
    });

    test('대소문자를 구분하지 않고 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 대문자로 검색
      await helpers.searchEvent('PT');
      await page.waitForTimeout(500);

      // 'PT'가 포함된 '운동' 일정이 표시되어야 함
      await expect(helpers.getEventLocator('운동')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 소문자로 검색
      await helpers.searchEvent('pt');
      await page.waitForTimeout(500);

      // 동일하게 '운동' 일정이 표시되어야 함
      expect(await helpers.findEventCard('운동')).toBeVisible();
      expect(await helpers.findEventListItem('운동')).toBeVisible();
    });

    test('부분 일치로 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '점심'으로 검색
      await helpers.searchEvent('점심');
      await page.waitForTimeout(500);

      // '점심 약속'이 표시되어야 함
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // '약속'으로 검색
      await helpers.searchEvent('약속');
      await page.waitForTimeout(500);

      // 동일하게 '점심 약속'이 표시되어야 함
      expect(await helpers.findEventCard('점심 약속')).toBeVisible();
      expect(await helpers.findEventListItem('점심 약속')).toBeVisible();
    });

    test('검색 결과가 캘린더와 리스트 양쪽에 반영된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '업무' 카테고리 일정들 검색
      await helpers.searchEvent('회의실');
      await page.waitForTimeout(500);

      // 캘린더에 표시되는지 확인
      const calendarEvent = await helpers.findEventCard('팀 회의');
      await expect(calendarEvent).toBeVisible();

      // 리스트에 표시되는지 확인
      const listEvent = await helpers.findEventListItem('팀 회의');
      await expect(listEvent).toBeVisible();

      // 검색되지 않은 일정은 양쪽 모두에서 보이지 않아야 함
      await expect(helpers.getEventLocator('점심 약속')).toHaveCount(0);
    });
  });

  test.describe('2. 여러 일정 동시 검색', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 공통 키워드를 가진 일정들 생성
      await helpers.createEvent({
        title: '회의 A',
        date: dates.week1Day2,
        startTime: '09:00',
        endTime: '10:00',
        description: '팀 회의',
        location: '회의실 1',
        category: '업무',
      });

      await helpers.createEvent({
        title: '회의 B',
        date: dates.week1Day3,
        startTime: '11:00',
        endTime: '12:00',
        description: '부서 회의',
        location: '회의실 2',
        category: '업무',
      });

      await helpers.createEvent({
        title: '클라이언트 미팅',
        date: dates.week1Day4,
        startTime: '14:00',
        endTime: '15:00',
        description: '회의',
        location: '회의실 3',
        category: '업무',
      });

      await helpers.createEvent({
        title: '저녁 식사',
        date: dates.week1Day5,
        startTime: '18:00',
        endTime: '19:00',
        description: '가족 식사',
        location: '집',
        category: '개인',
      });
    });

    test('공통 키워드로 여러 일정을 동시에 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '회의'로 검색
      await helpers.searchEvent('회의');
      await page.waitForTimeout(500);

      // 3개의 회의 관련 일정이 표시되어야 함
      // 각 일정당 캘린더 1개 + 리스트 1개 = 2개씩, 총 6개
      const eventCount =
        (await helpers.getEventLocator('회의 A').count()) +
        (await helpers.getEventLocator('회의 B').count()) +
        (await helpers.getEventLocator('클라이언트 미팅').count());

      expect(eventCount).toBe(6);

      // '저녁 식사'는 표시되지 않아야 함
      await expect(helpers.getEventLocator('저녁 식사')).toHaveCount(0);
    });

    test('검색 결과가 날짜순으로 정렬되어 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // '회의'로 검색
      await helpers.searchEvent('회의');
      await page.waitForTimeout(500);

      // 리스트에서 순서 확인
      const eventList = page.locator('[data-testid="event-list"] > div[role="listitem"]');
      const eventTitles = await eventList.allTextContents();

      // '회의 A', '회의 B', '클라이언트 미팅' 순서로 표시되어야 함
      const titles = eventTitles
        .map((text) => {
          if (text.includes('회의 A')) return '회의 A';
          if (text.includes('회의 B')) return '회의 B';
          if (text.includes('클라이언트 미팅')) return '클라이언트 미팅';
          return null;
        })
        .filter(Boolean);

      expect(titles).toEqual(['회의 A', '회의 B', '클라이언트 미팅']);
    });
  });

  test.describe('3. 검색어 초기화 및 빈 검색', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.createEvent({
        title: '일정 1',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '일정 2',
        date: dates.week1Day3,
        startTime: '14:00',
        endTime: '15:00',
        category: '개인',
      });
    });

    test('검색어를 지우면 모든 일정이 다시 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 먼저 검색
      await helpers.searchEvent('일정 1');
      await page.waitForTimeout(500);

      // '일정 1'만 표시
      await expect(helpers.getEventLocator('일정 1')).toHaveCount(2);
      await expect(helpers.getEventLocator('일정 2')).toHaveCount(0);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 모든 일정이 다시 표시되어야 함
      await expect(helpers.getEventLocator('일정 1')).toHaveCount(2);
      await expect(helpers.getEventLocator('일정 2')).toHaveCount(2);
    });

    test('빈 검색어로는 모든 일정이 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 빈 검색어로 검색
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 모든 일정이 표시되어야 함
      await expect(helpers.getEventLocator('일정 1')).toHaveCount(2);
      await expect(helpers.getEventLocator('일정 2')).toHaveCount(2);
    });

    test('검색 결과가 없을 때 안내 메시지가 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 존재하지 않는 키워드로 검색
      await helpers.searchEvent('존재하지않는일정xyz');
      await page.waitForTimeout(500);

      // 일정이 표시되지 않아야 함
      await expect(helpers.getEventLocator('일정 1')).toHaveCount(0);
      await expect(helpers.getEventLocator('일정 2')).toHaveCount(0);

      // "검색 결과가 없습니다" 메시지 확인
      const noResultMessage = page.locator('text=검색 결과가 없습니다');
      await expect(noResultMessage).toBeVisible();
    });
  });

  test.describe('4. 월간 뷰 날짜 필터링', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 7월에 일정들 생성
      await helpers.createEvent({
        title: '7월 첫째주 일정',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '7월 둘째주 일정',
        date: dates.week2Day3,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '7월 셋째주 일정',
        date: dates.week3Day5,
        startTime: '16:00',
        endTime: '17:00',
        category: '업무',
      });

      // 8월에 일정 생성
      await helpers.createEvent({
        title: '8월 일정',
        date: dates.nextMonth,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });
    });

    test('월간 뷰에서 현재 월의 일정만 필터링되어 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 7월 뷰 확인 (이미 beforeEach에서 이동됨)
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 7월 일정들은 표시되어야 함
      await expect(helpers.getEventLocator('7월 첫째주 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('7월 둘째주 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('7월 셋째주 일정')).toHaveCount(2);

      // 8월 일정은 표시되지 않아야 함
      await expect(helpers.getEventLocator('8월 일정')).toHaveCount(0);
    });

    test('월을 변경하면 해당 월의 일정만 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 월간 뷰로 변경
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 8월로 이동
      await helpers.navigateToMonth(2025, 8);
      await page.waitForTimeout(500);

      // 8월 일정만 표시되어야 함
      await expect(helpers.getEventLocator('8월 일정')).toHaveCount(2);

      // 7월 일정들은 표시되지 않아야 함
      await expect(helpers.getEventLocator('7월 첫째주 일정')).toHaveCount(0);
      await expect(helpers.getEventLocator('7월 둘째주 일정')).toHaveCount(0);
      await expect(helpers.getEventLocator('7월 셋째주 일정')).toHaveCount(0);
    });

    test('월간 뷰에서 검색과 날짜 필터링이 함께 동작한다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 월간 뷰로 변경
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // '첫째주'로 검색
      await helpers.searchEvent('첫째주');
      await page.waitForTimeout(500);

      // 7월의 '첫째주' 일정만 표시되어야 함
      await expect(helpers.getEventLocator('7월 첫째주 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('7월 둘째주 일정')).toHaveCount(0);
      await expect(helpers.getEventLocator('7월 셋째주 일정')).toHaveCount(0);
      await expect(helpers.getEventLocator('8월 일정')).toHaveCount(0);
    });
  });

  test.describe('5. 주간 뷰 날짜 필터링', () => {
    test.beforeEach(async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 7월 첫째 주에 일정들 생성
      await helpers.createEvent({
        title: '첫째주 월요일',
        date: dates.week1Day1,
        startTime: '09:00',
        endTime: '10:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '첫째주 수요일',
        date: dates.week1Day3,
        startTime: '11:00',
        endTime: '12:00',
        category: '업무',
      });

      // 7월 둘째 주에 일정 생성
      await helpers.createEvent({
        title: '둘째주 화요일',
        date: dates.week2Day2,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      // 7월 셋째 주에 일정 생성
      await helpers.createEvent({
        title: '셋째주 목요일',
        date: dates.week3Day4,
        startTime: '16:00',
        endTime: '17:00',
        category: '업무',
      });
    });

    test('주간 뷰에서 현재 주의 일정만 필터링되어 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 주간 뷰로 변경
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      // 첫째 주 일정들만 표시되어야 함
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(2);
      await expect(helpers.getEventLocator('첫째주 수요일')).toHaveCount(2);

      // 다른 주 일정은 표시되지 않아야 함
      await expect(helpers.getEventLocator('둘째주 화요일')).toHaveCount(0);
      await expect(helpers.getEventLocator('셋째주 목요일')).toHaveCount(0);
    });

    test('주를 변경하면 해당 주의 일정만 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 주간 뷰로 변경
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      // 다음 주로 이동 (한 번 next)
      await helpers.navigateCalendar('next');
      await page.waitForTimeout(500);

      // 둘째 주 일정만 표시되어야 함
      await expect(helpers.getEventLocator('둘째주 화요일')).toHaveCount(2);

      // 첫째 주 일정은 표시되지 않아야 함
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(0);
      await expect(helpers.getEventLocator('첫째주 수요일')).toHaveCount(0);

      // 한 번 더 next로 셋째 주로 이동
      await helpers.navigateCalendar('next');
      await page.waitForTimeout(500);

      // 셋째 주 일정만 표시되어야 함
      await expect(helpers.getEventLocator('셋째주 목요일')).toHaveCount(2);

      // 다른 주 일정은 표시되지 않아야 함
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(0);
      await expect(helpers.getEventLocator('둘째주 화요일')).toHaveCount(0);
    });

    test('주간 뷰에서 검색과 날짜 필터링이 함께 동작한다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 주간 뷰로 변경
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      // '첫째주'로 검색
      await helpers.searchEvent('첫째주');
      await page.waitForTimeout(500);

      // 현재 주(첫째 주)의 '첫째주' 일정만 표시되어야 함
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(2);
      await expect(helpers.getEventLocator('첫째주 수요일')).toHaveCount(2);

      // 다른 일정은 표시되지 않아야 함
      await expect(helpers.getEventLocator('둘째주 화요일')).toHaveCount(0);
      await expect(helpers.getEventLocator('셋째주 목요일')).toHaveCount(0);
    });

    test('주간 뷰와 월간 뷰를 전환해도 검색어가 유지된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 주간 뷰로 변경
      await helpers.changeView('week');
      await page.waitForTimeout(500);

      // '월요일'로 검색
      await helpers.searchEvent('월요일');
      await page.waitForTimeout(500);

      // 주간 뷰에서 검색 결과 확인
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(2);

      // 월간 뷰로 변경
      await helpers.changeView('month');
      await page.waitForTimeout(500);

      // 검색어가 유지되고 결과도 동일하게 표시되어야 함
      const searchInput = page.locator('input[placeholder*="검색"]').first();
      await expect(searchInput).toHaveValue('월요일');
      await expect(helpers.getEventLocator('첫째주 월요일')).toHaveCount(2);
    });
  });

  test.describe('6. 검색과 일정 CRUD 통합', () => {
    test('일정을 생성하면 검색 결과에 즉시 반영된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 검색어 먼저 입력
      await helpers.searchEvent('신규');
      await page.waitForTimeout(500);

      // 검색 결과 없음 확인
      const noResultMessage = page.locator('text=검색 결과가 없습니다');
      await expect(noResultMessage).toBeVisible();

      // '신규'가 포함된 일정 생성
      await helpers.createEvent({
        title: '신규 프로젝트 킥오프',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      // 검색 결과에 즉시 반영되어야 함
      await expect(helpers.getEventLocator('신규 프로젝트 킥오프')).toHaveCount(2);
      await expect(noResultMessage).not.toBeVisible();
    });

    test('일정을 수정하면 검색 결과가 업데이트된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 일정 생성
      await helpers.createEvent({
        title: '기존 일정',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      // '기존'으로 검색
      await helpers.searchEvent('기존');
      await page.waitForTimeout(500);

      // 검색 결과 확인
      await expect(helpers.getEventLocator('기존 일정')).toHaveCount(2);

      // 일정 제목 수정
      await helpers.updateEvent('기존 일정', {
        title: '변경된 일정',
      });

      // 기존 검색어로는 더 이상 검색되지 않아야 함
      await expect(helpers.getEventLocator('변경된 일정')).toHaveCount(0);

      // 검색어를 '변경'으로 변경
      await helpers.searchEvent('변경');
      await page.waitForTimeout(500);

      // 수정된 일정이 검색되어야 함
      await expect(helpers.getEventLocator('변경된 일정')).toHaveCount(2);
    });

    test('일정을 삭제하면 검색 결과에서 제거된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 일정 2개 생성
      await helpers.createEvent({
        title: '삭제할 일정',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      await helpers.createEvent({
        title: '유지할 일정',
        date: dates.week1Day3,
        startTime: '14:00',
        endTime: '15:00',
        category: '업무',
      });

      // '일정'으로 검색
      await helpers.searchEvent('일정');
      await page.waitForTimeout(500);

      // 2개 모두 검색되어야 함
      await expect(helpers.getEventLocator('삭제할 일정')).toHaveCount(2);
      await expect(helpers.getEventLocator('유지할 일정')).toHaveCount(2);

      // 일정 삭제
      await helpers.deleteEvent('삭제할 일정');

      // 삭제된 일정은 검색 결과에서 제거되어야 함
      await expect(helpers.getEventLocator('삭제할 일정')).toHaveCount(0);

      // 유지할 일정은 여전히 검색되어야 함
      await expect(helpers.getEventLocator('유지할 일정')).toHaveCount(2);
    });
  });

  test.describe('7. 특수 문자 및 엣지 케이스', () => {
    test('특수 문자가 포함된 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 특수 문자가 포함된 일정 생성
      await helpers.createEvent({
        title: '❗️ [중요] Q1 리뷰 (필수)',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        description: '1분기 성과 검토 & 계획 수립',
        location: 'A동 3층 회의실 #1',
        category: '업무',
      });

      // 특수 문자로 검색
      await helpers.searchEvent('❗️');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('❗️ [중요] Q1 리뷰 (필수)')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 괄호로 검색
      await helpers.searchEvent('(필수)');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('[중요] Q1 리뷰 (필수)')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // & 기호로 검색
      await helpers.searchEvent('&');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('[중요] Q1 리뷰 (필수)')).toHaveCount(2);
    });

    test('긴 검색어로 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      // 긴 제목의 일정 생성
      await helpers.createEvent({
        title: '2025년 상반기 전사 경영전략 수립을 위한 임원진 워크샵 및 전략 회의',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      // 긴 검색어로 검색
      await helpers.searchEvent('2025년 상반기 전사 경영전략');
      await page.waitForTimeout(500);

      await expect(
        helpers.getEventLocator(
          '2025년 상반기 전사 경영전략 수립을 위한 임원진 워크샵 및 전략 회의'
        )
      ).toHaveCount(2);
    });

    test('공백이 포함된 검색어로 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.createEvent({
        title: '팀 빌딩 워크샵',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        category: '업무',
      });

      // 공백이 포함된 검색어
      await helpers.searchEvent('팀 빌딩');
      await page.waitForTimeout(500);

      await expect(helpers.getEventLocator('팀 빌딩 워크샵')).toHaveCount(2);
    });

    test('숫자로만 된 일정을 검색할 수 있다', async ({ page }) => {
      const helpers = new E2EHelpers(page);
      const dates = getFixedTestDates();

      await helpers.createEvent({
        title: '2025 계획',
        date: dates.week1Day2,
        startTime: '10:00',
        endTime: '11:00',
        description: '123번 프로젝트',
        location: '404호',
        category: '업무',
      });

      // 숫자로 검색
      await helpers.searchEvent('2025');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('2025 계획')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 설명의 숫자로 검색
      await helpers.searchEvent('123');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('2025 계획')).toHaveCount(2);

      // 검색어 초기화
      await helpers.searchEvent('');
      await page.waitForTimeout(500);

      // 위치의 숫자로 검색
      await helpers.searchEvent('404');
      await page.waitForTimeout(500);
      await expect(helpers.getEventLocator('2025 계획')).toHaveCount(2);
    });
  });
});
