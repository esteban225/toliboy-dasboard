import { createReducer, on } from "@ngrx/store";
import * as FormResponseActions from "../actions/formResponse.actions";

export interface FormResponseState {
  response: any | null;
  loading: boolean;
  error: any | null;
}

export const initialState: FormResponseState = {
  response: null,
  loading: false,
  error: null,
};

export const formResponseReducer = createReducer(
  initialState,
  on(FormResponseActions.submitForm, (state) => ({
    ...state,
    loading: true,
    error: null,
  })),
  on(FormResponseActions.submitFormSuccess, (state, { response }) => ({
    ...state,
    response,
    loading: false,
    error: null,
  })),
  on(FormResponseActions.submitFormFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  }))
);