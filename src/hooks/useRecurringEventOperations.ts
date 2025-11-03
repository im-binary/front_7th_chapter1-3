/* global RequestInit */

import { Event } from '../types';

/**
 * API endpoints for recurring event operations
 */
const API_ENDPOINTS = {
  events: '/api/events',
  recurringEvents: '/api/recurring-events',
} as const;

/**
 * HTTP method constants
 */
const HTTP_METHODS = {
  PUT: 'PUT',
  DELETE: 'DELETE',
} as const;

/**
 * Default event repeat configuration for non-recurring events
 */
const DEFAULT_REPEAT_CONFIG = {
  type: 'none' as const,
  interval: 0,
};

/**
 * Custom hook for managing recurring event operations
 * Provides functionality for editing and deleting recurring events
 */
export const useRecurringEventOperations = (
  events: Event[],
  updateEvents: (events: Event[]) => void
) => {
  const isRecurringEvent = (event: Event): boolean => {
    return event.repeat.type !== 'none' && event.repeat.interval > 0;
  };

  const isSameRecurringSeries = (eventA: Event, eventB: Event): boolean => {
    return (
      eventA.repeat.type === eventB.repeat.type &&
      eventA.repeat.interval === eventB.repeat.interval &&
      eventA.title === eventB.title &&
      eventA.startTime === eventB.startTime &&
      eventA.endTime === eventB.endTime &&
      eventA.description === eventB.description &&
      eventA.location === eventB.location &&
      eventA.category === eventB.category
    );
  };

  const findRelatedRecurringEvents = (targetEvent: Event): Event[] => {
    if (!isRecurringEvent(targetEvent)) {
      return [];
    }

    // Find ALL events that are part of the same recurring series
    // If repeat.id is present, prefer matching by repeat.id (reliable series identifier)
    if (targetEvent.repeat.id) {
      const seriesEventsById = events.filter((event) => event.repeat.id === targetEvent.repeat.id);
      return seriesEventsById.length > 1 ? seriesEventsById : [];
    }

    const seriesEvents = events.filter(
      (event) => isRecurringEvent(event) && isSameRecurringSeries(event, targetEvent)
    );

    // If there's only one event in the series (just the target event itself), return empty array
    // If there are multiple events in the series, return all events including the target
    return seriesEvents.length > 1 ? seriesEvents : [];
  };

  /**
   * Generic API request handler with error handling
   */
  const makeApiRequest = async (url: string, method: string, body?: unknown): Promise<boolean> => {
    try {
      const config: RequestInit = { method };

      if (body !== undefined) {
        config.headers = { 'Content-Type': 'application/json' };
        config.body = JSON.stringify(body);
      }

      const response = await fetch(url, config);
      return response.ok;
    } catch (error) {
      console.error(`API request failed: ${method} ${url}`, error);
      return false;
    }
  };

  const updateEventOnServer = async (event: Event): Promise<boolean> => {
    return makeApiRequest(`${API_ENDPOINTS.events}/${event.id}`, HTTP_METHODS.PUT, event);
  };

  const deleteEventOnServer = async (eventId: string): Promise<boolean> => {
    return makeApiRequest(`${API_ENDPOINTS.events}/${eventId}`, HTTP_METHODS.DELETE);
  };

  const deleteRecurringEventOnServer = async (repeatId: string): Promise<boolean> => {
    return makeApiRequest(`${API_ENDPOINTS.recurringEvents}/${repeatId}`, HTTP_METHODS.DELETE);
  };

  const updateRecurringEventOnServer = async (
    repeatId: string,
    updateData: Partial<Event>
  ): Promise<boolean> => {
    return makeApiRequest(
      `${API_ENDPOINTS.recurringEvents}/${repeatId}`,
      HTTP_METHODS.PUT,
      updateData
    );
  };

  const createSingleEditEvent = (updatedEvent: Event): Event => ({
    ...updatedEvent,
    repeat: DEFAULT_REPEAT_CONFIG,
  });

  /**
   * Prefers recurring API when repeatId is available, falls back to individual updates
   */
  const updateRecurringSeries = async (
    originalEvent: Event,
    updatedEvent: Event,
    relatedEvents: Event[]
  ): Promise<boolean> => {
    const repeatId = originalEvent.repeat.id;

    // detect whether date field changed (we need to shift series by delta days)
    const msPerDay = 24 * 60 * 60 * 1000;
    const originalDate = new Date(originalEvent.date);
    const updatedDate = new Date(updatedEvent.date);
    const deltaDays = Math.round((updatedDate.getTime() - originalDate.getTime()) / msPerDay);
    const dateChanged = deltaDays !== 0;

    const addDaysToDateString = (dateStr: string, days: number) => {
      const d = new Date(dateStr);
      d.setDate(d.getDate() + days);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${dd}`;
    };

    // If only non-date fields chㅌㅈanged and server has recurring API, use it.
    if (!dateChanged && repeatId) {
      const updateData = {
        title: updatedEvent.title,
        description: updatedEvent.description,
        location: updatedEvent.location,
        category: updatedEvent.category,
        notificationTime: updatedEvent.notificationTime,
      };
      return await updateRecurringEventOnServer(repeatId, updateData);
    }

    // For date-shifts (or when no repeatId), compute updated event list and try batch update
    const updatedEvents = relatedEvents.map((event) => {
      const newDate = dateChanged ? addDaysToDateString(event.date, deltaDays) : event.date;
      return { ...event, title: updatedEvent.title, date: newDate };
    });

    // Use events-list batch PUT when possible
    const batchUpdated = await makeApiRequest('/api/events-list', 'PUT', {
      events: updatedEvents,
    });

    if (batchUpdated) return true;

    // fallback: update one-by-one
    const results = await Promise.all(updatedEvents.map((event) => updateEventOnServer(event)));
    return results.every((result) => result);
  };

  /**
   * Handles editing of recurring events with user choice for scope
   * @param updatedEvent - The event with updated information
   * @param editSingleOnly - true for single event edit, false for series edit
   */
  const handleRecurringEdit = async (
    updatedEvent: Event,
    editSingleOnly: boolean
  ): Promise<void> => {
    const originalEvent = events.find((e) => e.id === updatedEvent.id);

    if (!originalEvent) {
      await updateEventOnServer(updatedEvent);
      updateEvents([]);
      return;
    }

    const relatedEvents = findRelatedRecurringEvents(originalEvent);

    if (relatedEvents.length === 0 || editSingleOnly) {
      const singleEvent = createSingleEditEvent(updatedEvent);
      await updateEventOnServer(singleEvent);
      updateEvents([]);
      return;
    }

    await updateRecurringSeries(originalEvent, updatedEvent, relatedEvents);
    updateEvents([]);
  };

  /**
   * Prefers recurring API when repeatId is available, falls back to individual deletion
   */
  const deleteRecurringSeries = async (
    eventToDelete: Event,
    relatedEvents: Event[]
  ): Promise<boolean> => {
    const repeatId = eventToDelete.repeat.id;

    if (repeatId) {
      return await deleteRecurringEventOnServer(repeatId);
    } else {
      const results = await Promise.all(
        relatedEvents.map((event) => deleteEventOnServer(event.id))
      );
      return results.every((result) => result);
    }
  };

  const executeDeleteAndRefresh = async (
    deleteOperation: () => Promise<boolean>
  ): Promise<void> => {
    await deleteOperation();
    updateEvents([]);
  };

  /**
   * Handles deletion of recurring events with user choice for scope
   * @param eventToDelete - The event to be deleted
   * @param deleteSingleOnly - true for single event deletion, false for series deletion
   */
  const handleRecurringDelete = async (
    eventToDelete: Event,
    deleteSingleOnly: boolean
  ): Promise<void> => {
    const relatedEvents = findRelatedRecurringEvents(eventToDelete);

    if (relatedEvents.length === 0) {
      await executeDeleteAndRefresh(() => deleteEventOnServer(eventToDelete.id));
      return;
    }

    if (deleteSingleOnly) {
      await executeDeleteAndRefresh(() => deleteEventOnServer(eventToDelete.id));
    } else {
      await executeDeleteAndRefresh(() => deleteRecurringSeries(eventToDelete, relatedEvents));
    }
  };

  return {
    handleRecurringEdit,
    handleRecurringDelete,
    findRelatedRecurringEvents,
  };
};
