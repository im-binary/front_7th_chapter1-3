import { FormControl, FormLabel, Stack, TextField, Typography } from '@mui/material';

import { EventCard } from './EventCard';
import { Event } from '../../types';

interface EventListProps {
  events: Event[];
  notifiedEvents: string[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onEditEvent: (event: Event) => void;
  onDeleteEvent: (event: Event) => void;
}

/**
 * 이벤트 목록 및 검색 컴포넌트
 */
export const EventList = (props: EventListProps) => {
  const { events, notifiedEvents, searchTerm, onSearchChange, onEditEvent, onDeleteEvent } = props;

  return (
    <Stack
      data-testid="event-list"
      spacing={2}
      sx={{ width: '30%', height: '100%', overflowY: 'auto' }}
    >
      <FormControl fullWidth>
        <FormLabel htmlFor="search">일정 검색</FormLabel>
        <TextField
          id="search"
          size="small"
          placeholder="검색어를 입력하세요"
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </FormControl>

      {events.length === 0 ? (
        <Typography>검색 결과가 없습니다.</Typography>
      ) : (
        events.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            isNotified={notifiedEvents.includes(event.id)}
            onEdit={onEditEvent}
            onDelete={onDeleteEvent}
          />
        ))
      )}
    </Stack>
  );
};
