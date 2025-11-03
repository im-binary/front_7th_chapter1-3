import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import RecurringEventDialog from '../../components/dialogs/RecurringEventDialog';
import { Event } from '../../types';

const mockEvent: Event = {
  id: '1',
  title: '반복 테스트 이벤트',
  date: '2025-10-15',
  startTime: '09:00',
  endTime: '10:00',
  description: '반복 일정 테스트',
  location: '회의실 A',
  category: '업무',
  repeat: { type: 'daily', interval: 1 },
  notificationTime: 10,
};

const mockProps = {
  open: true,
  onClose: vi.fn(),
  onConfirm: vi.fn(),
  event: mockEvent,
};

describe('RecurringEventDialog', () => {
  describe('수정 모드', () => {
    it('반복 일정 다이얼로그가 올바르게 렌더링된다', () => {
      render(<RecurringEventDialog {...mockProps} />);

      expect(screen.getByText('반복 일정 수정')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 수정하시겠어요?')).toBeInTheDocument();
    });

    it('수정 모드에서 예/아니오 버튼이 표시된다', () => {
      render(<RecurringEventDialog {...mockProps} />);

      expect(screen.getByText('예')).toBeInTheDocument();
      expect(screen.getByText('아니오')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('수정 모드에서 예 버튼 클릭 시 editSingleOnly=true로 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();

      render(<RecurringEventDialog {...mockProps} onConfirm={mockOnConfirm} />);

      await user.click(screen.getByText('예'));

      expect(mockOnConfirm).toHaveBeenCalledWith(true);
    });

    it('수정 모드에서 아니오 버튼 클릭 시 editSingleOnly=false로 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();

      render(<RecurringEventDialog {...mockProps} onConfirm={mockOnConfirm} />);

      await user.click(screen.getByText('아니오'));

      expect(mockOnConfirm).toHaveBeenCalledWith(false);
    });

    it('수정 모드에서 취소 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(<RecurringEventDialog {...mockProps} onClose={mockOnClose} />);

      await user.click(screen.getByText('취소'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('다이얼로그가 열려있지 않으면 렌더링되지 않는다', () => {
      render(<RecurringEventDialog {...mockProps} open={false} />);

      expect(screen.queryByText('반복 일정 수정')).not.toBeInTheDocument();
    });
  });

  describe('삭제 모드 (P0 테스트)', () => {
    const mockDeleteProps = {
      ...mockProps,
      mode: 'delete' as const,
    };

    it('삭제 모드에서 다이얼로그가 올바르게 렌더링된다', () => {
      render(<RecurringEventDialog {...mockDeleteProps} />);

      expect(screen.getByText('반복 일정 삭제')).toBeInTheDocument();
      expect(screen.getByText('해당 일정만 삭제하시겠어요?')).toBeInTheDocument();
    });

    it('삭제 모드에서 예/아니오 버튼이 표시된다', () => {
      render(<RecurringEventDialog {...mockDeleteProps} />);

      expect(screen.getByText('예')).toBeInTheDocument();
      expect(screen.getByText('아니오')).toBeInTheDocument();
      expect(screen.getByText('취소')).toBeInTheDocument();
    });

    it('삭제 모드에서 예 버튼 클릭 시 deleteSingleOnly=true로 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();

      render(<RecurringEventDialog {...mockDeleteProps} onConfirm={mockOnConfirm} />);

      await user.click(screen.getByText('예'));

      expect(mockOnConfirm).toHaveBeenCalledWith(true);
    });

    it('삭제 모드에서 아니오 버튼 클릭 시 deleteSingleOnly=false로 onConfirm이 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnConfirm = vi.fn();

      render(<RecurringEventDialog {...mockDeleteProps} onConfirm={mockOnConfirm} />);

      await user.click(screen.getByText('아니오'));

      expect(mockOnConfirm).toHaveBeenCalledWith(false);
    });

    it('삭제 모드에서 취소 버튼 클릭 시 onClose가 호출된다', async () => {
      const user = userEvent.setup();
      const mockOnClose = vi.fn();

      render(<RecurringEventDialog {...mockDeleteProps} onClose={mockOnClose} />);

      await user.click(screen.getByText('취소'));

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('삭제 모드에서 다이얼로그가 열려있지 않으면 렌더링되지 않는다', () => {
      render(<RecurringEventDialog {...mockDeleteProps} open={false} />);

      expect(screen.queryByText('반복 일정 삭제')).not.toBeInTheDocument();
    });
  });
});
