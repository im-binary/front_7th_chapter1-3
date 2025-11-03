import { Delete, Edit, Notifications, Repeat } from '@mui/icons-material';
import { Box, IconButton, Stack, Tooltip, Typography } from '@mui/material';

import { notificationOptions } from '../../constants/calendar';
import { Event } from '../../types';
import { getRepeatTypeLabel } from '../../utils/eventFormatters';

interface EventCardProps {
  event: Event;
  isNotified: boolean;
  onEdit: (event: Event) => void;
  onDelete: (event: Event) => void;
}

/**
 * 이벤트 목록에 표시되는 개별 이벤트 카드 컴포넌트
 */
export const EventCard = ({ event, isNotified, onEdit, onDelete }: EventCardProps) => {
  const isRepeating = event.repeat.type !== 'none';

  return (
    <Box sx={{ border: 1, borderRadius: 2, p: 3, width: '100%' }}>
      <Stack direction="row" justifyContent="space-between">
        <Stack>
          <Stack direction="row" spacing={1} alignItems="center">
            {isNotified && <Notifications color="error" />}
            {isRepeating && (
              <Tooltip
                title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
                  event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
                }`}
              >
                <Repeat fontSize="small" />
              </Tooltip>
            )}
            <Typography
              fontWeight={isNotified ? 'bold' : 'normal'}
              color={isNotified ? 'error' : 'inherit'}
            >
              {event.title}
            </Typography>
          </Stack>
          <Typography>{event.date}</Typography>
          <Typography>
            {event.startTime} - {event.endTime}
          </Typography>
          <Typography>{event.description}</Typography>
          <Typography>{event.location}</Typography>
          <Typography>카테고리: {event.category}</Typography>
          {isRepeating && (
            <Typography>
              반복: {event.repeat.interval}
              {getRepeatTypeLabel(event.repeat.type)}마다
              {event.repeat.endDate && ` (종료: ${event.repeat.endDate})`}
            </Typography>
          )}
          <Typography>
            알림:{' '}
            {notificationOptions.find((option) => option.value === event.notificationTime)?.label}
          </Typography>
        </Stack>
        <Stack>
          <IconButton aria-label="Edit event" onClick={() => onEdit(event)}>
            <Edit />
          </IconButton>
          <IconButton aria-label="Delete event" onClick={() => onDelete(event)}>
            <Delete />
          </IconButton>
        </Stack>
      </Stack>
    </Box>
  );
};
