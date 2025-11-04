import {
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';

import { weekDays } from '../../constants/calendar';
import { Event } from '../../types';
import { formatWeek, getWeekDates, formatDate } from '../../utils/dateUtils';
import { EventBadge } from '../event/EventBadge';

interface WeekViewProps {
  currentDate: Date;
  filteredEvents: Event[];
  notifiedEvents: string[];
  onMoveEvent?: (id: string, targetDate: string) => void;
  onDateClick?: (dateString: string) => void;
}

/**
 * 주간 캘린더 뷰 컴포넌트
 */
export const WeekView = (props: WeekViewProps) => {
  const { currentDate, filteredEvents, notifiedEvents, onMoveEvent, onDateClick } = props;

  const weekDates = getWeekDates(currentDate);

  return (
    <Stack data-testid="week-view" spacing={4} sx={{ width: '100%' }}>
      <Typography variant="h5">{formatWeek(currentDate)}</Typography>
      <TableContainer>
        <Table sx={{ tableLayout: 'fixed', width: '100%' }}>
          <TableHead>
            <TableRow>
              {weekDays.map((day) => (
                <TableCell key={day} sx={{ width: '14.28%', padding: 1, textAlign: 'center' }}>
                  {day}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            <TableRow>
              {weekDates.map((date) => (
                <TableCell
                  key={date.toISOString()}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    const id = e.dataTransfer.getData('text/plain');
                    if (id && onMoveEvent) {
                      const dateString = formatDate(date, date.getDate());
                      onMoveEvent(id, dateString);
                    }
                  }}
                  onClick={() => {
                    if (onDateClick) {
                      const dateString = formatDate(date, date.getDate());
                      onDateClick(dateString);
                    }
                  }}
                  sx={{
                    height: '120px',
                    verticalAlign: 'top',
                    width: '14.28%',
                    padding: 1,
                    border: '1px solid #e0e0e0',
                    overflow: 'hidden',
                  }}
                >
                  <Typography variant="body2" fontWeight="bold">
                    {date.getDate()}
                  </Typography>
                  {filteredEvents
                    .filter((event) => new Date(event.date).toDateString() === date.toDateString())
                    .map((event) => (
                      <EventBadge
                        key={event.id}
                        event={event}
                        isNotified={notifiedEvents.includes(event.id)}
                      />
                    ))}
                </TableCell>
              ))}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>
    </Stack>
  );
};
