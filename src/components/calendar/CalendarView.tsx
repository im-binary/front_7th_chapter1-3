import { ChevronLeft, ChevronRight } from '@mui/icons-material';
import { IconButton, MenuItem, Select, Stack, Typography } from '@mui/material';

import { MonthView } from './MonthView';
import { WeekView } from './WeekView';
import { Event } from '../../types';

interface CalendarViewProps {
  view: 'week' | 'month';
  currentDate: Date;
  filteredEvents: Event[];
  notifiedEvents: string[];
  holidays: Record<string, string>;
  onDateClick?: (dateString: string) => void;
  onViewChange: (_view: 'week' | 'month') => void;
  onNavigate: (_direction: 'prev' | 'next') => void;
  onMoveEvent?: (_id: string, _targetDate: string) => void;
}

/**
 * 캘린더 뷰 통합 컴포넌트 (주간/월간 뷰 전환)
 */
export const CalendarView = (props: CalendarViewProps) => {
  const {
    view,
    currentDate,
    filteredEvents,
    notifiedEvents,
    holidays,
    onViewChange,
    onNavigate,
    onMoveEvent,
    onDateClick,
  } = props;

  return (
    <Stack flex={1} spacing={5}>
      <Typography variant="h4">일정 보기</Typography>

      <Stack direction="row" spacing={2} justifyContent="space-between" alignItems="center">
        <IconButton aria-label="Previous" onClick={() => onNavigate('prev')}>
          <ChevronLeft />
        </IconButton>
        <Select
          size="small"
          aria-label="뷰 타입 선택"
          value={view}
          onChange={(e) => onViewChange(e.target.value as 'week' | 'month')}
        >
          <MenuItem value="week" aria-label="week-option">
            Week
          </MenuItem>
          <MenuItem value="month" aria-label="month-option">
            Month
          </MenuItem>
        </Select>
        <IconButton aria-label="Next" onClick={() => onNavigate('next')}>
          <ChevronRight />
        </IconButton>
      </Stack>

      {view === 'week' && (
        <WeekView
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          notifiedEvents={notifiedEvents}
          onMoveEvent={onMoveEvent}
          onDateClick={onDateClick}
        />
      )}
      {view === 'month' && (
        <MonthView
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          notifiedEvents={notifiedEvents}
          holidays={holidays}
          onMoveEvent={onMoveEvent}
          onDateClick={onDateClick}
        />
      )}
    </Stack>
  );
};
