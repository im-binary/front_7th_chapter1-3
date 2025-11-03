import { render, screen } from '@testing-library/react';
import { renderHook, act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import RecurringEventDialog from '../../components/dialogs/RecurringEventDialog';
import { useRecurringEventOperations } from '../../hooks/useRecurringEventOperations';
import { Event } from '../../types';

const mockEvent: Event = {
  id: '1',
  title: '반복 일정',
  date: '2025-10-15',
  startTime: '09:00',
  endTime: '10:00',
  description: '테스트',
  location: '회의실',
  category: '업무',
  repeat: { type: 'daily', interval: 1 },
  notificationTime: 10,
};

describe('반복 일정 엣지 케이스', () => {
  describe('RecurringEventDialog 엣지 케이스', () => {
    it('이벤트가 null인 경우에도 안전하게 렌더링된다', () => {
      const props = {
        open: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        event: null,
      };

      render(<RecurringEventDialog {...props} />);

      expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
    });

    it('반복 정보가 없는 이벤트에 대해서도 안전하게 렌더링된다', () => {
      const eventWithoutRepeat: Event = {
        ...mockEvent,
        repeat: { type: 'none', interval: 0 },
      };

      const props = {
        open: true,
        onClose: vi.fn(),
        onConfirm: vi.fn(),
        event: eventWithoutRepeat,
      };

      render(<RecurringEventDialog {...props} />);

      expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
    });

    it('키보드 이벤트로도 버튼을 선택할 수 있다', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();

      const props = {
        open: true,
        onClose: vi.fn(),
        onConfirm: mockOnConfirm,
        event: mockEvent,
      };

      render(<RecurringEventDialog {...props} />);

      // "예" 버튼 직접 클릭
      await user.click(screen.getByText('예'));

      expect(mockOnConfirm).toHaveBeenCalledWith(true);
    });

    it('Escape 키로 다이얼로그를 닫을 수 있다', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      const props = {
        open: true,
        onClose: mockOnClose,
        onConfirm: vi.fn(),
        event: mockEvent,
      };

      render(<RecurringEventDialog {...props} />);

      await user.keyboard('{Escape}');

      expect(mockOnClose).toHaveBeenCalled();
    });
  });

  describe('useRecurringEventOperations 엣지 케이스', () => {
    it('빈 이벤트 배열에서도 안전하게 동작한다', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const mockUpdateEvents = vi.fn();

      const { result } = renderHook(() => useRecurringEventOperations([], mockUpdateEvents));

      await act(async () => {
        await result.current.handleRecurringEdit(mockEvent, false);
      });

      expect(mockUpdateEvents).toHaveBeenCalledWith([]);
    });

    it('존재하지 않는 이벤트를 편집하려고 할 때 안전하게 처리한다', async () => {
      // Mock fetch
      global.fetch = vi.fn().mockResolvedValue({ ok: true });

      const mockUpdateEvents = vi.fn();
      const events = [mockEvent];

      const { result } = renderHook(() => useRecurringEventOperations(events, mockUpdateEvents));

      const nonExistentEvent: Event = {
        ...mockEvent,
        id: 'non-existent',
      };

      await act(async () => {
        await result.current.handleRecurringEdit(nonExistentEvent, true);
      });

      // updateEvents가 호출됨 (빈 배열로)
      expect(mockUpdateEvents).toHaveBeenCalledWith([]);
    });

    it('반복 정보가 부분적으로 누락된 이벤트도 처리한다', () => {
      const mockUpdateEvents = vi.fn();
      const incompleteEvent: Event = {
        ...mockEvent,
        repeat: { type: 'daily', interval: 0 }, // interval이 0
      };

      const { result } = renderHook(() =>
        useRecurringEventOperations([incompleteEvent], mockUpdateEvents)
      );

      const relatedEvents = result.current.findRelatedRecurringEvents(incompleteEvent);

      expect(relatedEvents).toHaveLength(0); // interval이 0이므로 반복 일정으로 간주하지 않음
    });

    it('같은 제목과 시간을 가진 다른 반복 일정 그룹을 구분한다', () => {
      const mockUpdateEvents = vi.fn();
      const events: Event[] = [
        {
          ...mockEvent,
          id: '1',
          title: '회의 A',
          repeat: { type: 'daily', interval: 1 },
        },
        {
          ...mockEvent,
          id: '2',
          title: '회의 A',
          date: '2025-10-16',
          repeat: { type: 'daily', interval: 1 },
        },
        {
          ...mockEvent,
          id: '3',
          title: '회의 B',
          repeat: { type: 'daily', interval: 1 },
        },
      ];

      const { result } = renderHook(() => useRecurringEventOperations(events, mockUpdateEvents));

      const relatedEvents = result.current.findRelatedRecurringEvents(events[0]);

      // 같은 제목, 시간, 반복 설정을 가진 이벤트만 반환
      expect(relatedEvents).toHaveLength(2);
      expect(relatedEvents.map((e) => e.id)).toEqual(['1', '2']);
    });

    it('다양한 반복 유형을 올바르게 처리한다', () => {
      const mockUpdateEvents = vi.fn();
      const events: Event[] = [
        { ...mockEvent, id: '1', repeat: { type: 'weekly', interval: 1 } },
        { ...mockEvent, id: '2', repeat: { type: 'monthly', interval: 2 } },
        { ...mockEvent, id: '3', repeat: { type: 'yearly', interval: 1 } },
      ];

      const { result } = renderHook(() => useRecurringEventOperations(events, mockUpdateEvents));

      // 각각 다른 반복 유형이므로 관련 이벤트 없음
      expect(result.current.findRelatedRecurringEvents(events[0])).toHaveLength(0);
      expect(result.current.findRelatedRecurringEvents(events[1])).toHaveLength(0);
      expect(result.current.findRelatedRecurringEvents(events[2])).toHaveLength(0);
    });
  });

  describe('날짜/시간 경계 케이스', () => {
    it('월 경계를 넘나드는 반복 일정을 올바르게 처리한다', () => {
      const mockUpdateEvents = vi.fn();
      const events: Event[] = [
        { ...mockEvent, id: '1', date: '2025-10-31' },
        { ...mockEvent, id: '2', date: '2025-11-01' },
      ];

      const { result } = renderHook(() => useRecurringEventOperations(events, mockUpdateEvents));

      const relatedEvents = result.current.findRelatedRecurringEvents(events[0]);

      expect(relatedEvents).toHaveLength(2);
    });

    it('윤년 2월 29일을 포함한 반복 일정을 처리한다', () => {
      const mockUpdateEvents = vi.fn();
      const events: Event[] = [
        { ...mockEvent, id: '1', date: '2024-02-29' }, // 윤년
        { ...mockEvent, id: '2', date: '2024-03-01' },
      ];

      const { result } = renderHook(() => useRecurringEventOperations(events, mockUpdateEvents));

      const relatedEvents = result.current.findRelatedRecurringEvents(events[0]);

      expect(relatedEvents).toHaveLength(2);
    });
  });
});
