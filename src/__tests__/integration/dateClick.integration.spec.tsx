import CssBaseline from '@mui/material/CssBaseline';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { render, screen, within } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { SnackbarProvider } from 'notistack';
import { ReactElement } from 'react';
import { describe, it, expect } from 'vitest';

import { setupMockHandlerCreation } from '../../__mocks__/handlersUtils';
import App from '../../App';

const theme = createTheme();

const setup = (element: ReactElement) => {
  const user = userEvent.setup();

  return {
    ...render(
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <SnackbarProvider>{element}</SnackbarProvider>
      </ThemeProvider>
    ),
    user,
  };
};

describe('날짜 클릭으로 일정 생성 기능 통합 테스트', () => {
  describe('정상 케이스', () => {
    it('월간 뷰에서 빈 날짜 셀을 클릭하면 해당 날짜가 폼에 자동으로 채워진다', async () => {
      setupMockHandlerCreation([]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      // 날짜 셀 클릭 (15일)
      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.trim() === '15';
      });

      expect(dateCell).toBeInTheDocument();
      await user.click(dateCell!);

      // 날짜 입력 필드 확인
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
      expect(dateInput.value).toMatch(/2025-10-15/);
    });

    it('주간 뷰에서 빈 날짜 셀을 클릭하면 해당 날짜가 폼에 자동으로 채워진다', async () => {
      setupMockHandlerCreation([]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 주간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const weekView = screen.getByRole('option', { name: 'week-option' });
      await user.click(weekView);

      // 날짜 셀 클릭
      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.includes('1');
      });

      expect(dateCell).toBeInTheDocument();
      await user.click(dateCell!);

      // 날짜 입력 필드 확인
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
      expect(dateInput.value).toMatch(/2025-10-01/);
    });

    it('날짜를 클릭한 후 일정을 추가할 수 있다', async () => {
      setupMockHandlerCreation([]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      // 25일 클릭
      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.trim() === '25';
      });

      await user.click(dateCell!);

      // 날짜가 채워졌는지 확인
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
      expect(dateInput.value).toMatch(/2025-10-25/);

      // 일정 정보 입력
      const titleInput = screen.getByLabelText('제목');
      await user.type(titleInput, '프로젝트 데모');

      const timeInputs = screen.getAllByLabelText(/시간/);
      await user.type(timeInputs[0], '15:00');
      await user.type(timeInputs[1], '16:00');

      // 일정 추가
      await user.click(screen.getByTestId('event-submit-button'));

      // 일정이 추가되었는지 확인
      await screen.findByText('일정이 추가되었습니다');
      const eventList = within(screen.getByTestId('event-list'));
      expect(eventList.getByText('프로젝트 데모')).toBeInTheDocument();
    });

    it('날짜를 클릭하면 편집 중이던 일정의 날짜가 변경된다', async () => {
      setupMockHandlerCreation([
        {
          id: '1',
          title: '기존 미팅',
          date: '2025-10-15',
          startTime: '10:00',
          endTime: '11:00',
          description: '',
          location: '',
          category: '업무',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 10,
        },
      ]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 일정 편집 시작
      const editButtons = await screen.findAllByLabelText('Edit event');
      await user.click(editButtons[0]);

      // 제목이 채워졌는지 확인
      const titleInput = screen.getByLabelText('제목') as HTMLInputElement;
      expect(titleInput.value).toBe('기존 미팅');

      // 월간 뷰로 전환하고 다른 날짜 클릭
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.trim() === '20';
      });

      await user.click(dateCell!);

      // 새로운 날짜가 채워졌는지 확인
      expect(titleInput.value).toBe('기존 미팅');
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
      expect(dateInput.value).toMatch(/2025-10-20/);
    });
  });

  describe('예외 케이스', () => {
    it('이미 일정이 있는 날짜를 클릭해도 날짜가 폼에 채워진다', async () => {
      setupMockHandlerCreation([
        {
          id: '1',
          title: '기존 미팅',
          date: '2025-10-15',
          startTime: '10:00',
          endTime: '11:00',
          description: '',
          location: '',
          category: '업무',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 10,
        },
      ]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      // 일정이 있는 날짜 셀 클릭 (15일)
      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.includes('15') && text.includes('기존 미팅');
      });

      expect(dateCell).toBeInTheDocument();
      await user.click(dateCell!);

      // 날짜가 채워졌는지 확인
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;
      expect(dateInput.value).toMatch(/2025-10-15/);
    });

    it('날짜를 클릭한 후 시간 겹침이 있는 일정을 추가하려고 하면 경고가 표시된다', async () => {
      setupMockHandlerCreation([
        {
          id: '1',
          title: '기존 미팅',
          date: '2025-10-15',
          startTime: '10:00',
          endTime: '11:00',
          description: '',
          location: '',
          category: '업무',
          repeat: { type: 'none', interval: 0 },
          notificationTime: 10,
        },
      ]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      // 같은 날짜 클릭 (15일)
      const tableCells = screen.getAllByRole('cell');
      const dateCell = tableCells.find((cell) => {
        const text = cell.textContent;
        return text?.includes('15');
      });

      await user.click(dateCell!);

      // 겹치는 시간대로 일정 입력
      const titleInput = screen.getByLabelText('제목');
      await user.type(titleInput, '새 미팅');

      const timeInputs = screen.getAllByLabelText(/시간/);
      await user.type(timeInputs[0], '10:30');
      await user.type(timeInputs[1], '11:30');

      // 일정 추가 시도
      await user.click(screen.getByTestId('event-submit-button'));

      // 겹침 다이얼로그 확인
      expect(await screen.findByText(/일정 겹침/i)).toBeInTheDocument();
    });

    it('날짜를 여러 번 클릭해도 마지막 클릭한 날짜가 폼에 반영된다', async () => {
      setupMockHandlerCreation([]);
      const { user } = setup(<App />);

      await screen.findByText('일정 로딩 완료!');

      // 월간 뷰로 전환
      await user.click(within(screen.getByLabelText('뷰 타입 선택')).getByRole('combobox'));
      const monthView = screen.getByRole('option', { name: 'month-option' });
      await user.click(monthView);

      const tableCells = screen.getAllByRole('cell');
      const dateInput = screen.getByLabelText('날짜') as HTMLInputElement;

      // 15일 클릭
      const cell15 = tableCells.find((cell) => cell.textContent?.trim() === '15');
      await user.click(cell15!);
      expect(dateInput.value).toMatch(/2025-10-15/);

      // 20일 클릭
      const cell20 = tableCells.find((cell) => cell.textContent?.trim() === '20');
      await user.click(cell20!);
      expect(dateInput.value).toMatch(/2025-10-20/);

      // 25일 클릭
      const cell25 = tableCells.find((cell) => cell.textContent?.trim() === '25');
      await user.click(cell25!);
      expect(dateInput.value).toMatch(/2025-10-25/);
    });
  });
});
