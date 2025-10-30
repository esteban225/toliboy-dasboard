import { createFeatureSelector, createSelector } from '@ngrx/store';
import { FormState } from '../reducers/forms.reducers';

export const selectFormState = createFeatureSelector<FormState>('forms');

export const selectAllForms = createSelector(
    selectFormState,
    (state: FormState) => state.forms
);

export const selectFormsLoading = createSelector(
    selectFormState,
    (state: FormState) => state.loading
);

export const selectFormsError = createSelector(
    selectFormState,
    (state: FormState) => state.error
);  