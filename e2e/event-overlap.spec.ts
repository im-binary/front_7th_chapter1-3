import { E2EHelpers } from './E2EHelpers';
import { expect, test } from './fixtures';

test.describe('일정 겹침 처리', () => {
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

    // 모든 테스트를 위해 캘린더를 2025년 6월로 이동
    const helpers = new E2EHelpers(page);
    await helpers.waitForPageLoad();
    await helpers.navigateToMonth(2025, 6);
  });

  test.afterEach(async ({ request }) => {
    // 각 테스트 후 태그된 테스트 데이터 정리
    await E2EHelpers.cleanupTestData(request);
  });

  test.describe('1. 기본 겹침 감지', () => {
    test('완전히 겹치는 일정을 생성하면 경고 다이얼로그가 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 첫 번째 일정 생성
      await helpers.createEvent({
        title: '팀 회의',
        date: '2025-06-10',
        startTime: '10:00',
        endTime: '11:00',
        description: '주간 팀 회의',
        location: '회의실 A',
        category: '업무',
      });

      await expect(page.getByText('팀 회의').first()).toBeVisible();

      // 완전히 겹치는 일정 생성 시도
      await helpers.createEvent({
        title: '개인 미팅',
        date: '2025-06-10',
        startTime: '10:00',
        endTime: '11:00',
        description: '1:1 미팅',
        location: '회의실 B',
        category: '업무',
      });

      // 겹침 경고 다이얼로그 확인
      await expect(page.getByText('일정 겹침 경고')).toBeVisible();
      await expect(page.getByText('다음 일정과 겹칩니다:')).toBeVisible();
    });

    test('부분적으로 겹치는 일정(시작 시간 겹침)을 생성하면 경고가 표시된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 첫 번째 일정: 10:00-12:00
      await helpers.createEvent({
        title: '프로젝트 회의',
        date: '2025-06-11',
        startTime: '10:00',
        endTime: '12:00',
        description: '프로젝트 진행 상황 논의',
        location: '대회의실',
        category: '업무',
      });

      // 두 번째 일정: 11:00-13:00 (부분 겹침)
      await helpers.createEvent({
        title: '점심 약속',
        date: '2025-06-11',
        startTime: '11:00',
        endTime: '13:00',
        description: '거래처 점심 미팅',
        location: '레스토랑',
        category: '업무',
      });

      // 겹침 경고 확인
      await expect(page.getByText('일정 겹침 경고')).toBeVisible();
      await expect(page.getByText(/다음 일정과 겹칩니다/)).toBeVisible();
      await expect(page.getByText('프로젝트 회의 (2025-06-11 10:00-12:00)')).toBeVisible();
    });
  });

  test.describe('2. 겹침 경고 후 사용자 선택', () => {
    test('겹침 경고에서 "계속"을 선택하면 일정이 생성된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 첫 번째 일정 생성
      await helpers.createEvent({
        title: '회의 A',
        date: '2025-06-10',
        startTime: '09:00',
        endTime: '10:00',
        description: '첫 번째 회의',
        location: '회의실 1',
        category: '업무',
      });

      // 겹치는 일정 생성
      await helpers.createEvent({
        title: '회의 B',
        date: '2025-06-10',
        startTime: '09:00',
        endTime: '10:00',
        description: '두 번째 회의',
        location: '회의실 2',
        category: '업무',
      });

      // 겹침 경고 확인 및 "계속 진행" 버튼 클릭
      await expect(page.getByText('일정 겹침 경고')).toBeVisible();
      await page.getByRole('button', { name: '계속 진행' }).click();

      // 두 일정 모두 표시되는지 확인
      await expect(page.getByText('회의 A').first()).toBeVisible();
      await expect(page.getByText('회의 B').first()).toBeVisible();
    });

    test('겹침 경고에서 "취소"를 선택하면 일정이 생성되지 않는다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 첫 번째 일정 생성
      await helpers.createEvent({
        title: '중요 회의',
        date: '2025-06-11',
        startTime: '15:00',
        endTime: '16:00',
        description: '매우 중요한 회의',
        location: '본사',
        category: '업무',
      });

      await expect(page.getByText('중요 회의').first()).toBeVisible();

      await helpers.createEvent({
        title: '덜 중요한 회의',
        date: '2025-06-11',
        startTime: '15:00',
        endTime: '16:00',
        description: '나중에 해도 되는 회의',
        location: '지점',
        category: '업무',
      });

      // 겹침 경고 확인 및 "취소" 버튼 클릭
      await expect(page.getByText('일정 겹침 경고')).toBeVisible();
      await page.getByRole('button', { name: '취소' }).click();

      // 첫 번째 일정만 있고 두 번째 일정은 없어야 함
      await expect(page.getByText('중요 회의').first()).toBeVisible();
      await expect(page.getByText('덜 중요한 회의')).not.toBeVisible();
    });
  });

  test.describe('3. 겹침 없는 경우', () => {
    test('시간대가 완전히 다른 일정은 경고 없이 생성된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 오전 일정
      await helpers.createEvent({
        title: '오전 회의',
        date: '2025-06-12',
        startTime: '09:00',
        endTime: '10:00',
        description: '오전 미팅',
        location: '회의실',
        category: '업무',
      });

      await expect(page.getByText('오전 회의').first()).toBeVisible();

      // 오후 일정 (겹치지 않음)
      await helpers.createEvent({
        title: '오후 회의',
        date: '2025-06-12',
        startTime: '14:00',
        endTime: '15:00',
        description: '오후 미팅',
        location: '회의실',
        category: '업무',
      });

      // 겹침 경고가 표시되지 않아야 함
      await expect(page.getByText('일정 겹침 경고')).not.toBeVisible();

      // 두 일정 모두 표시되어야 함
      await expect(page.getByText('오전 회의').first()).toBeVisible();
      await expect(page.getByText('오후 회의').first()).toBeVisible();
    });

    test('시작 시간과 종료 시간이 연속된 일정은 경고 없이 생성된다', async ({ page }) => {
      const helpers = new E2EHelpers(page);

      // 첫 번째 일정: 10:00-11:00
      await helpers.createEvent({
        title: '세션 1',
        date: '2025-06-13',
        startTime: '10:00',
        endTime: '11:00',
        description: '첫 번째 세션',
        location: '강의실',
        category: '업무',
      });

      await expect(page.getByText('세션 1').first()).toBeVisible();

      // 두 번째 일정: 11:00-12:00 (정확히 연속)
      await helpers.createEvent({
        title: '세션 2',
        date: '2025-06-13',
        startTime: '11:00',
        endTime: '12:00',
        description: '두 번째 세션',
        location: '강의실',
        category: '업무',
      });

      // 겹침 경고가 표시되지 않아야 함
      await expect(page.getByText('일정 겹침 경고')).not.toBeVisible();

      // 두 일정 모두 표시되어야 함
      await expect(page.getByText('세션 1').first()).toBeVisible();
      await expect(page.getByText('세션 2').first()).toBeVisible();
    });
  });
});
