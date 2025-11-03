import { Notifications, Repeat } from '@mui/icons-material';
import { Box, Stack, Tooltip, Typography } from '@mui/material';

import { eventBoxStyles } from '../../constants/calendar';
import { Event } from '../../types';
import { getRepeatTypeLabel } from '../../utils/eventFormatters';

interface EventBadgeProps {
  event: Event;
  isNotified: boolean;
}

/**
 * 캘린더 셀에 표시되는 개별 이벤트 배지 컴포넌트
 */
export const EventBadge = (props: EventBadgeProps) => {
  const { event, isNotified } = props;

  const isRepeating = event.repeat.type !== 'none';

  return (
    <Box
      sx={{
        ...eventBoxStyles.common,
        ...(isNotified ? eventBoxStyles.notified : eventBoxStyles.normal),
      }}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData('text/plain', event.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
    >
      <Stack direction="row" spacing={1} alignItems="center">
        {isNotified && <Notifications fontSize="small" />}
        {isRepeating && (
          <Tooltip
            title={`${event.repeat.interval}${getRepeatTypeLabel(event.repeat.type)}마다 반복${
              event.repeat.endDate ? ` (종료: ${event.repeat.endDate})` : ''
            }`}
          >
            <Repeat fontSize="small" />
          </Tooltip>
        )}
        <Typography variant="caption" noWrap sx={{ fontSize: '0.75rem', lineHeight: 1.2 }}>
          {event.title}
        </Typography>
      </Stack>
    </Box>
  );
};
