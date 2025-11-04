import { type Page } from '@playwright/test';

interface CreateEventParams {
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  description?: string;
  location?: string;
  category?: string;
}

interface UpdateEventParams {
  title?: string;
  date?: string;
  startTime?: string;
  endTime?: string;
  description?: string;
  location?: string;
  category?: string;
}

export class E2EHelpers {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('domcontentloaded');
    await this.page.waitForSelector('text=일정 보기', { timeout: 10000 });
    await this.page.waitForSelector('button[aria-label="Previous"]', { timeout: 5000 });
    await this.page.waitForSelector('button[aria-label="Next"]', { timeout: 5000 });
    await this.page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => {});
  }

  async openEventCreateModal() {
    await this.page.waitForSelector('text=제목', { timeout: 5000 });
  }

  async createEvent(params: CreateEventParams) {
    const {
      title,
      date,
      startTime,
      endTime,
      description = '',
      location = '',
      category = '업무',
    } = params;
    await this.openEventCreateModal();

    // E2E 테스트 데이터임을 표시하는 태그 추가
    const taggedTitle = `[E2E-TEST] ${title}`;
    await this.page.fill('text=제목', taggedTitle);
    await this.page.fill('input[type="date"]', date);
    const timeInputs = await this.page.locator('input[type="time"]').all();
    await timeInputs[0].fill(startTime);
    await timeInputs[1].fill(endTime);
    if (description) {
      await this.page.fill('input#description', description);
    }
    if (location) {
      await this.page.fill('input#location', location);
    }
    const categorySelect = this.page.locator('div[aria-label="카테고리"]').first();
    await categorySelect.click();
    await this.page.waitForSelector('[role="listbox"]', { timeout: 3000 });
    await this.page.click(`li[aria-label="${category}-option"]`);
    await this.page.waitForTimeout(500);

    await this.page.click('button:has-text("일정 추가")');
    await this.page.waitForTimeout(1000);
  }

  async searchEvent(keyword: string) {
    const searchInput = this.page.locator('input[placeholder*="검색"]').first();
    await searchInput.fill(keyword);
    await this.page.waitForTimeout(500);
  }

  async findEventCard(title: string) {
    // E2E 테스트 태그를 자동으로 추가
    const taggedTitle = `[E2E-TEST] ${title}`;
    return this.page.locator(`text=${taggedTitle}`).first();
  }

  async findEventListItem(title: string) {
    // E2E 테스트 태그를 자동으로 추가
    const taggedTitle = `[E2E-TEST] ${title}`;
    return this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({ hasText: taggedTitle });
  }

  async openEventEditModal(title: string) {
    // 특정 제목을 포함하고 편집 버튼이 있는 컨테이너 찾기
    const eventListItem = this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({ hasText: `[E2E-TEST] ${title}` })
      .first();
    await eventListItem.locator('button[aria-label="Edit event"]').click();
    await this.page.waitForSelector('text=일정 수정', { timeout: 5000 });
  }

  async updateEvent(originalTitle: string, updates: UpdateEventParams = {}) {
    const eventListItem = this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({
        hasText: `[E2E-TEST] ${originalTitle}`,
        has: this.page.locator('button[aria-label="Edit event"]'),
      })
      .first();
    await eventListItem.locator('button[aria-label="Edit event"]').click();

    const { title, date, startTime, endTime, description, location, category } = updates;
    if (title !== undefined) {
      // 수정 시에도 E2E 태그 유지
      const taggedTitle = `[E2E-TEST] ${title}`;
      await this.page.fill('text=제목', taggedTitle);
    }
    if (date !== undefined) {
      await this.page.fill('input[type="date"]', date);
    }
    if (startTime !== undefined) {
      const timeInputs = await this.page.locator('input[type="time"]').all();
      await timeInputs[0].fill(startTime);
    }
    if (endTime !== undefined) {
      const timeInputs = await this.page.locator('input[type="time"]').all();
      await timeInputs[1].fill(endTime);
    }
    if (description !== undefined) {
      await this.page.fill('input#description', description);
    }
    if (location !== undefined) {
      await this.page.fill('input#location', location);
    }
    if (category !== undefined) {
      const categorySelect = this.page.locator('div[aria-label="카테고리"]').first();
      await categorySelect.click();
      await this.page.waitForSelector('[role="listbox"]', { timeout: 3000 });
      await this.page.click(`li[aria-label="${category}-option"]`);
    }
    await this.page.click('button:has-text("일정 수정")');
    await this.page.waitForTimeout(1000);
  }

  async deleteEvent(title: string) {
    const eventListItem = await this.findEventListItem(title);
    await eventListItem.locator('button[aria-label="Delete event"]').click();
    await this.page.waitForTimeout(1000);
  }

  async changeView(view: 'week' | 'month') {
    const viewSelect = this.page.locator('div[aria-label="뷰 타입 선택"]');
    await viewSelect.click();
    await this.page.waitForSelector('[role="listbox"]', { timeout: 3000 });
    await this.page.click(`li[aria-label="${view}-option"]`);
    await this.page.waitForTimeout(500);
  }

  async navigateCalendar(direction: 'prev' | 'next') {
    const ariaLabel = direction === 'prev' ? 'Previous' : 'Next';
    await this.page.click(`button[aria-label="${ariaLabel}"]`);
    await this.page.waitForTimeout(300);
  }

  async getEventCount() {
    const eventItems = await this.page.locator('[class*="MuiListItem"]').all();
    return eventItems.length;
  }

  async closeModal() {
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(300);
  }

  // 검증 헬퍼 메서드 - 태그를 자동으로 처리하여 테스트 작성자는 신경쓰지 않아도 됨
  getEventLocator(title: string) {
    const taggedTitle = `[E2E-TEST] ${title}`;
    return this.page.locator(`text=${taggedTitle}`);
  }

  // 정적 메서드: 태그 기반 데이터 정리 (request 필요)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async cleanupTestData(request: any, tag: string = '[E2E-TEST]') {
    await request.delete('http://localhost:3000/api/events-by-tag', {
      data: { tag },
    });
  }
}
