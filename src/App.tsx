import { Box, Stack } from '@mui/material';
import { useSnackbar } from 'notistack';
import { useState } from 'react';

import { CalendarView } from './components/calendar/CalendarView';
import { OverlapDialog } from './components/dialogs/OverlapDialog';
import { RecurringEventDialog } from './components/dialogs/RecurringEventDialog';
import { EventForm } from './components/event/EventForm';
import { EventList } from './components/event/EventList';
import { NotificationStack } from './components/notifications/NotificationStack';
import { useCalendarView } from './hooks/useCalendarView';
import { useEventForm } from './hooks/useEventForm';
import { useEventOperations } from './hooks/useEventOperations';
import { useNotifications } from './hooks/useNotifications';
import { useRecurringEventOperations } from './hooks/useRecurringEventOperations';
import { useSearch } from './hooks/useSearch';
import { Event, EventForm as EventFormData } from './types';
import { findOverlappingEvents } from './utils/eventOverlap';

function App() {
  const {
    title,
    setTitle,
    date,
    setDate,
    startTime,
    endTime,
    description,
    setDescription,
    location,
    setLocation,
    category,
    setCategory,
    isRepeating,
    setIsRepeating,
    repeatType,
    setRepeatType,
    repeatInterval,
    setRepeatInterval,
    repeatEndDate,
    setRepeatEndDate,
    notificationTime,
    setNotificationTime,
    startTimeError,
    endTimeError,
    editingEvent,
    setEditingEvent,
    handleStartTimeChange,
    handleEndTimeChange,
    resetForm,
    editEvent,
  } = useEventForm();

  const { events, saveEvent, updateEvent, deleteEvent, createRepeatEvent, fetchEvents } =
    useEventOperations(Boolean(editingEvent), () => setEditingEvent(null));

  const { handleRecurringEdit, handleRecurringDelete } = useRecurringEventOperations(
    events,
    async () => {
      // After recurring edit, refresh events from server
      await fetchEvents();
    }
  );

  const { notifications, notifiedEvents, setNotifications } = useNotifications(events);
  const { view, setView, currentDate, holidays, navigate } = useCalendarView();
  const { searchTerm, filteredEvents, setSearchTerm } = useSearch(events, currentDate, view);

  const [isOverlapDialogOpen, setIsOverlapDialogOpen] = useState(false);
  const [overlappingEvents, setOverlappingEvents] = useState<Event[]>([]);
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [pendingRecurringEdit, setPendingRecurringEdit] = useState<Event | null>(null);
  const [pendingRecurringMoveTarget, setPendingRecurringMoveTarget] = useState<string | null>(null);
  const [pendingRecurringDelete, setPendingRecurringDelete] = useState<Event | null>(null);
  const [recurringEditMode, setRecurringEditMode] = useState<boolean | null>(null); // true = single, false = all
  const [recurringDialogMode, setRecurringDialogMode] = useState<'edit' | 'delete'>('edit');

  const { enqueueSnackbar } = useSnackbar();

  /**
   * 이벤트 드래그로 날짜를 변경할 때 편집 폼으로 이동시켜 변경을 저장하도록 한다.
   * - 반복 일정은 드래그로 이동 불가
   */
  const handleMoveEvent = async (id: string, targetDate: string) => {
    const eventToMove = events.find((e) => e.id === id);
    if (!eventToMove) return;

    if (eventToMove.repeat.type !== 'none' && eventToMove.repeat.interval > 0) {
      // 반복 일정은 다이얼로그로 처리: 단일 편집 여부를 묻고 그에 따라 이동 처리
      setPendingRecurringEdit(eventToMove);
      setPendingRecurringMoveTarget(targetDate);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
      return;
    }

    const updatedEvent: Event = { ...eventToMove, date: targetDate };

    // 겹침 검사 (다른 이벤트들과 비교)
    const overlapping = findOverlappingEvents(
      updatedEvent,
      events.filter((e) => e.id !== id)
    );
    if (overlapping.length > 0) {
      enqueueSnackbar('이 날짜/시간에 겹치는 일정이 있어 이동할 수 없습니다.', {
        variant: 'error',
      });
      return;
    }

    // 바로 업데이트
    await updateEvent(updatedEvent);
  };

  /**
   * 반복 일정 편집/삭제 확인 처리
   */
  const handleRecurringConfirm = async (editSingleOnly: boolean) => {
    if (recurringDialogMode === 'edit' && pendingRecurringEdit) {
      // If there is a pending move target, this dialog was opened by a drag operation
      if (pendingRecurringMoveTarget) {
        console.log({ pendingRecurringMoveTarget, editSingleOnly });
        try {
          const updatedEvent: Event = { ...pendingRecurringEdit, date: pendingRecurringMoveTarget };
          await handleRecurringEdit(updatedEvent, editSingleOnly);
          enqueueSnackbar('일정이 이동되었습니다', { variant: 'success' });
        } catch (error) {
          console.error(error);
          enqueueSnackbar('일정 이동 실패', { variant: 'error' });
        }

        setIsRecurringDialogOpen(false);
        setPendingRecurringEdit(null);
        setPendingRecurringMoveTarget(null);
        return;
      }

      // 편집 모드 저장하고 편집 폼으로 이동
      setRecurringEditMode(editSingleOnly);
      editEvent(pendingRecurringEdit);
      setIsRecurringDialogOpen(false);
      setPendingRecurringEdit(null);
    } else if (recurringDialogMode === 'delete' && pendingRecurringDelete) {
      // 반복 일정 삭제 처리
      try {
        await handleRecurringDelete(pendingRecurringDelete, editSingleOnly);
        enqueueSnackbar('일정이 삭제되었습니다', { variant: 'success' });
      } catch (error) {
        console.error(error);
        enqueueSnackbar('일정 삭제 실패', { variant: 'error' });
      }
      setIsRecurringDialogOpen(false);
      setPendingRecurringDelete(null);
    }
  };

  /**
   * 이벤트가 반복 일정인지 확인
   */
  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  /**
   * 일정 편집 핸들러 (반복 일정 처리 포함)
   */
  const handleEditEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring edit dialog
      setPendingRecurringEdit(event);
      setRecurringDialogMode('edit');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event editing
      editEvent(event);
    }
  };

  /**
   * 일정 삭제 핸들러 (반복 일정 처리 포함)
   */
  const handleDeleteEvent = (event: Event) => {
    if (isRecurringEvent(event)) {
      // Show recurring delete dialog
      setPendingRecurringDelete(event);
      setRecurringDialogMode('delete');
      setIsRecurringDialogOpen(true);
    } else {
      // Regular event deletion
      deleteEvent(event.id);
    }
  };

  /**
   * 일정 추가/수정 핸들러
   * - 유효성 검사
   * - 겹침 검사
   * - 반복 일정 처리
   */
  const addOrUpdateEvent = async () => {
    if (!title || !date || !startTime || !endTime) {
      enqueueSnackbar('필수 정보를 모두 입력해주세요.', { variant: 'error' });
      return;
    }

    if (startTimeError || endTimeError) {
      enqueueSnackbar('시간 설정을 확인해주세요.', { variant: 'error' });
      return;
    }

    const eventData: Event | EventFormData = {
      id: editingEvent ? editingEvent.id : undefined,
      title,
      date,
      startTime,
      endTime,
      description,
      location,
      category,
      repeat: editingEvent
        ? editingEvent.repeat // Keep original repeat settings for recurring event detection
        : {
            type: isRepeating ? repeatType : 'none',
            interval: repeatInterval,
            endDate: repeatEndDate || undefined,
          },
      notificationTime,
    };

    const overlapping = findOverlappingEvents(eventData, events);
    const hasOverlapEvent = overlapping.length > 0;

    // 수정
    if (editingEvent) {
      if (hasOverlapEvent) {
        setOverlappingEvents(overlapping);
        setIsOverlapDialogOpen(true);
        return;
      }

      if (
        editingEvent.repeat.type !== 'none' &&
        editingEvent.repeat.interval > 0 &&
        recurringEditMode !== null
      ) {
        console.log({ eventData });
        await handleRecurringEdit(eventData as Event, recurringEditMode);
        setRecurringEditMode(null);
      } else {
        await saveEvent(eventData);
      }

      resetForm();
      return;
    }

    // 생성
    if (isRepeating) {
      // 반복 생성은 반복 일정을 고려하지 않는다.
      await createRepeatEvent(eventData);
      resetForm();
      return;
    }

    if (hasOverlapEvent) {
      setOverlappingEvents(overlapping);
      setIsOverlapDialogOpen(true);
      return;
    }

    await saveEvent(eventData);
    resetForm();
  };

  return (
    <Box sx={{ width: '100%', height: '100vh', margin: 'auto', p: 5 }}>
      <Stack direction="row" spacing={6} sx={{ height: '100%' }}>
        {/* 왼쪽: 일정 추가/수정 폼 */}
        <EventForm
          title={title}
          setTitle={setTitle}
          date={date}
          setDate={setDate}
          startTime={startTime}
          endTime={endTime}
          handleStartTimeChange={handleStartTimeChange}
          handleEndTimeChange={handleEndTimeChange}
          description={description}
          setDescription={setDescription}
          location={location}
          setLocation={setLocation}
          category={category}
          setCategory={setCategory}
          isRepeating={isRepeating}
          setIsRepeating={setIsRepeating}
          repeatType={repeatType}
          setRepeatType={setRepeatType}
          repeatInterval={repeatInterval}
          setRepeatInterval={setRepeatInterval}
          repeatEndDate={repeatEndDate}
          setRepeatEndDate={setRepeatEndDate}
          notificationTime={notificationTime}
          setNotificationTime={setNotificationTime}
          startTimeError={startTimeError}
          endTimeError={endTimeError}
          editingEvent={editingEvent}
          onSubmit={addOrUpdateEvent}
        />

        {/* 중앙: 캘린더 뷰 */}
        <CalendarView
          view={view}
          currentDate={currentDate}
          filteredEvents={filteredEvents}
          notifiedEvents={notifiedEvents}
          holidays={holidays}
          onViewChange={setView}
          onNavigate={navigate}
          onMoveEvent={handleMoveEvent}
        />

        {/* 오른쪽: 일정 목록 */}
        <EventList
          events={filteredEvents}
          notifiedEvents={notifiedEvents}
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          onEditEvent={handleEditEvent}
          onDeleteEvent={handleDeleteEvent}
        />
      </Stack>

      {/* 겹치는 일정 확인 다이얼로그 */}
      <OverlapDialog
        open={isOverlapDialogOpen}
        overlappingEvents={overlappingEvents}
        onClose={() => setIsOverlapDialogOpen(false)}
        onConfirm={() => {
          setIsOverlapDialogOpen(false);
          saveEvent({
            id: editingEvent ? editingEvent.id : undefined,
            title,
            date,
            startTime,
            endTime,
            description,
            location,
            category,
            repeat: {
              type: isRepeating ? repeatType : 'none',
              interval: repeatInterval,
              endDate: repeatEndDate || undefined,
            },
            notificationTime,
          });
        }}
      />

      {/* 반복 일정 편집/삭제 옵션 다이얼로그 */}
      <RecurringEventDialog
        open={isRecurringDialogOpen}
        onClose={() => {
          setIsRecurringDialogOpen(false);
          setPendingRecurringEdit(null);
          setPendingRecurringDelete(null);
        }}
        onConfirm={handleRecurringConfirm}
        event={recurringDialogMode === 'edit' ? pendingRecurringEdit : pendingRecurringDelete}
        mode={recurringDialogMode}
      />

      {/* 알림 스택 (화면 우상단) */}
      <NotificationStack
        notifications={notifications}
        onClose={(index) => setNotifications((prev) => prev.filter((_, i) => i !== index))}
      />
    </Box>
  );
}

export default App;
