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

interface RecurringEventParams extends CreateEventParams {
  repeatType: 'daily' | 'weekly' | 'monthly' | 'yearly';
  repeatInterval: number;
  repeatEndDate: string;
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

    await this.page.fill('text=제목', title);
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
    return this.page.locator(`text=${title}`).first();
  }

  async findEventListItem(title: string) {
    return this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({ hasText: title });
  }

  async openEventEditModal(title: string) {
    // 특정 제목을 포함하고 편집 버튼이 있는 컨테이너 찾기
    const eventListItem = this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({ hasText: title })
      .first();
    await eventListItem.locator('button[aria-label="Edit event"]').click();
    await this.page.waitForSelector('text=일정 수정', { timeout: 5000 });
  }

  async updateEvent(originalTitle: string, updates: UpdateEventParams = {}) {
    const eventListItem = this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({
        hasText: originalTitle,
        has: this.page.locator('button[aria-label="Edit event"]'),
      })
      .first();
    await eventListItem.locator('button[aria-label="Edit event"]').click();

    const { title, date, startTime, endTime, description, location, category } = updates;
    if (title !== undefined) {
      await this.page.fill('text=제목', title);
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
    await eventListItem.first().locator('button[aria-label="Delete event"]').click();
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

  /**
   * 캘린더를 특정 년/월로 이동
   * @param year 이동할 년도 (예: 2025)
   * @param month 이동할 월 (1-12)
   */
  async navigateToMonth(year: number, month: number) {
    // 월 뷰로 전환

    const viewSelect = this.page.locator('div[aria-label="뷰 타입 선택"]');
    await viewSelect.click();
    await this.page.waitForSelector('[role="listbox"]', { timeout: 3000 });
    await this.page.click(`li[aria-label="month-option"]`);
    await this.page.waitForTimeout(300);

    // 현재 날짜 가져오기 (헤더에서 년월 추출)
    // MonthView의 Typography h5 요소에서 "2025년 11월" 형식으로 표시됨
    const currentYearMonth = await this.page
      .locator('[data-testid="month-view"] .MuiTypography-h5')
      .first()
      .textContent();
    if (!currentYearMonth) return;

    // "2025년 11월" 형식에서 년/월 추출
    const match = currentYearMonth.match(/(\d{4})년\s*(\d{1,2})월/);
    if (!match) return;

    let currentYear = parseInt(match[1]);
    let currentMonth = parseInt(match[2]);
    const targetYear = year;
    const targetMonth = month;

    // 목표 월까지 이동 계산
    while (currentYear !== targetYear || currentMonth !== targetMonth) {
      if (currentYear < targetYear || (currentYear === targetYear && currentMonth < targetMonth)) {
        await this.navigateCalendar('next');
        currentMonth++;
        if (currentMonth > 12) {
          currentMonth = 1;
          currentYear++;
        }
      } else {
        await this.navigateCalendar('prev');
        currentMonth--;
        if (currentMonth < 1) {
          currentMonth = 12;
          currentYear--;
        }
      }
      // 무한 루프 방지
      await this.page.waitForTimeout(100);
    }

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

  // 검증 헬퍼 메서드
  getEventLocator(title: string) {
    return this.page.locator(`text=${title}`);
  }

  async createRecurringEvent(params: RecurringEventParams) {
    const {
      title,
      date,
      startTime,
      endTime,
      description = '',
      location = '',
      category = '업무',
      repeatType,
      repeatInterval,
      repeatEndDate,
    } = params;

    await this.openEventCreateModal();

    await this.page.fill('text=제목', title);
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

    // 반복 일정 설정
    const repeatCheckbox = this.page.locator('text=반복 일정');
    await repeatCheckbox.click();
    await this.page.waitForTimeout(300);

    // 반복 유형 선택
    const repeatTypeSelect = this.page.locator('div[aria-label="반복 유형"]');
    await repeatTypeSelect.click();
    await this.page.waitForSelector('[role="listbox"]', { timeout: 3000 });
    await this.page.click(`li[aria-label="${repeatType}-option"]`);
    await this.page.waitForTimeout(300);

    // 반복 간격 설정
    await this.page.fill('input#repeat-interval', repeatInterval.toString());

    // 반복 종료일 설정
    await this.page.fill('input#repeat-end-date', repeatEndDate);

    await this.page.click('button:has-text("일정 추가")');
    await this.page.waitForTimeout(1000);
  }

  async editRecurringEvent(
    title: string,
    editSingleOnly: boolean,
    updates: UpdateEventParams = {}
  ) {
    // 반복 일정 편집 버튼 클릭
    const eventListItem = this.page
      .locator('div[data-testid="event-list"] > div[role="listitem"]')
      .filter({ hasText: title })
      .first();
    await eventListItem.locator('button[aria-label="Edit event"]').click();

    // 반복 일정 다이얼로그가 나타날 때까지 대기
    await this.page.waitForSelector('text=반복 일정 수정', { timeout: 5000 });
    await this.page.waitForTimeout(300);

    // 반복 일정 다이얼로그에서 선택
    if (editSingleOnly) {
      await this.page.click('button:has-text("예")'); // 해당 일정만 수정
    } else {
      await this.page.click('button:has-text("아니오")'); // 모든 반복 일정 수정
    }
    await this.page.waitForTimeout(500);

    // 일정 수정 폼에서 업데이트
    const { title: newTitle, date, startTime, endTime, description, location, category } = updates;

    if (newTitle !== undefined) {
      await this.page.fill('text=제목', newTitle);
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

  async deleteRecurringEvent(title: string, deleteSingleOnly: boolean) {
    const eventListItem = await this.findEventListItem(title);
    await eventListItem.first().locator('button[aria-label="Delete event"]').click();

    // 반복 일정 다이얼로그가 나타날 때까지 대기
    await this.page.waitForSelector('text=반복 일정 삭제', { timeout: 5000 });
    await this.page.waitForTimeout(300);

    // 반복 일정 다이얼로그에서 선택
    if (deleteSingleOnly) {
      await this.page.click('button:has-text("예")'); // 해당 일정만 삭제
    } else {
      await this.page.click('button:has-text("아니오")'); // 모든 반복 일정 삭제
    }
    await this.page.waitForTimeout(1000);
  }

  async countEventsWithTitle(title: string): Promise<number> {
    const events = await this.page.locator(`text=${title}`).all();
    return events.length;
  }

  // 정적 메서드: E2E 데이터베이스 초기화
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  static async cleanupTestData(request: any) {
    // e2e.json 파일의 모든 이벤트를 삭제
    const response = await request.get('http://localhost:3000/api/events');
    const data = await response.json();

    if (data.events && data.events.length > 0) {
      const eventIds = data.events.map((event: { id: string }) => event.id);
      await request.delete('http://localhost:3000/api/events-list', {
        data: { eventIds },
      });
    }
  }
}
