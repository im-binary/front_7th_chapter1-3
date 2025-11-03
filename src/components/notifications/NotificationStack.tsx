import { Close } from '@mui/icons-material';
import { Alert, AlertTitle, IconButton, Stack } from '@mui/material';

interface NotificationStackProps {
  notifications: Array<{ message: string }>;
  onClose: (index: number) => void;
}

/**
 * 화면 우측 상단에 표시되는 알림 스택 컴포넌트
 */
export const NotificationStack = (props: NotificationStackProps) => {
  const { notifications, onClose } = props;

  if (notifications.length === 0) {
    return null;
  }

  return (
    <Stack position="fixed" top={16} right={16} spacing={2} alignItems="flex-end">
      {notifications.map((notification, index) => (
        <Alert
          key={index}
          severity="info"
          sx={{ width: 'auto' }}
          action={
            <IconButton size="small" onClick={() => onClose(index)}>
              <Close />
            </IconButton>
          }
        >
          <AlertTitle>{notification.message}</AlertTitle>
        </Alert>
      ))}
    </Stack>
  );
};
