import { createReducer, on, Action } from '@ngrx/store';
import { EventInput } from '@fullcalendar/core';
import { addEvent, deleteEvent, fetchEvents, fetchEventsSuccess, updateEventsSuccess } from '../actions/calendar.actions';

export interface CalendarState {
    events: EventInput[];
    error: string | null;
}

export const initialState: CalendarState = {
    events: [],
    error: null
};

export const calendarReducer = createReducer(
    initialState,
    on(fetchEvents, (state) => ({
        ...state,
        error: null
    })),
    on(fetchEventsSuccess, (state, { events }) => ({
        ...state,
        events,
        error: null
    })),
    on(addEvent, (state, { event }) => ({
        ...state,
        events: [...state.events, event],
        error: null
    })),
    on(updateEventsSuccess, (state, { event }) => ({
        ...state,
        events: state.events.map(e => e.id === event.id ? { ...e, ...event } : e),
        error: null
    })),
    on(deleteEvent, (state, { eventId }) => ({
        ...state,
        events: state.events.filter(event => event.id !== eventId),
        error: null
    }))
);

// Selector
export function reducer(state: CalendarState | undefined, action: Action) {
    return calendarReducer(state, action);
  }
