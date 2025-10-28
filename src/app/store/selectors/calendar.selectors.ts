import { createFeatureSelector, createSelector } from '@ngrx/store';
import { CalendarState } from '../reducers/calendar.reducer';

export const selectCalendarState = createFeatureSelector<CalendarState>('calendar');

export const getEvents = createSelector(
    selectCalendarState,
    (state: CalendarState) => state.events
);

export const getError = createSelector(
    selectCalendarState,
    (state: CalendarState) => state.error
);

export const getEventById = (id: string) => createSelector(
    selectCalendarState,
    (state: CalendarState) => state.events.find(event => event.id === id)
);
