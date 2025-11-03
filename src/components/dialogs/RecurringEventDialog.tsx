import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material';

import { Event } from '../../types';

/**
 * Available operation modes for the recurring event dialog
 */
type DialogMode = 'edit' | 'delete';

/**
 * Dialog content configuration for different modes
 */
const DIALOG_CONFIG = {
  edit: {
    title: '반복 일정 수정',
    message: '해당 일정만 수정하시겠어요?',
  },
  delete: {
    title: '반복 일정 삭제',
    message: '해당 일정만 삭제하시겠어요?',
  },
} as const;

/**
 * Button text constants
 */
const BUTTON_TEXT = {
  cancel: '취소',
  no: '아니오',
  yes: '예',
} as const;

/**
 * Props for the RecurringEventDialog component
 */
interface RecurringEventDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback fired when the dialog should be closed */
  onClose: () => void;
  /** Callback fired when user confirms an action */
  onConfirm: (editSingleOnly: boolean) => void;
  /** The event being operated on */
  event: Event | null;
  /** The operation mode */
  mode?: DialogMode;
}

/**
 * Dialog component for handling recurring event operations
 * Allows users to choose between single instance or series-wide operations
 */
const RecurringEventDialog = ({
  open,
  onClose,
  onConfirm,
  mode = 'edit',
}: RecurringEventDialogProps) => {
  /**
   * Handles the "Yes" button click - operates on single instance only
   */
  const handleSingleOperation = () => {
    onConfirm(true); // true = single instance operation
  };

  /**
   * Handles the "No" button click - operates on entire series
   */
  const handleSeriesOperation = () => {
    onConfirm(false); // false = series-wide operation
  };

  // Early return for closed dialog
  if (!open) return null;

  const config = DIALOG_CONFIG[mode];

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="recurring-event-dialog-title"
      aria-describedby="recurring-event-dialog-description"
    >
      <DialogTitle id="recurring-event-dialog-title">{config.title}</DialogTitle>

      <DialogContent>
        <Typography id="recurring-event-dialog-description">{config.message}</Typography>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose} color="inherit">
          {BUTTON_TEXT.cancel}
        </Button>
        <Button onClick={handleSeriesOperation} variant="outlined" color="primary">
          {BUTTON_TEXT.no}
        </Button>
        <Button onClick={handleSingleOperation} variant="contained" color="primary">
          {BUTTON_TEXT.yes}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RecurringEventDialog;
