import {createFeatureSelector, createSelector} from '@ngrx/store'
import {FormResponseState} from '../reducers/formResponse.reducers'

export const selectFormResponseState = createFeatureSelector<FormResponseState>('formResponse');

export const selectFormResponse = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.response
);

export const selectFormResponseLoading = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.loading
);

export const selectFormResponseError = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.error
);  

export const selectFormValidatorRules = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.response ? state.response.validatorRules : null
);