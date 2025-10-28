import { createReducer, on } from "@ngrx/store";
import * as FormResponseActions from "../actions/formResponse.actions";

export interface FormResponseState {
  response: any | null;
  forms: any[] | null;
  loading: boolean;
  error: any | null;
  validationRules: { [formId: number]: any } | null;
  validationRulesLoading: boolean;
  formFields: { [formId: number]: any[] } | null;
  formFieldsLoading: boolean;
}

export const initialState: FormResponseState = {
  response: null,
  forms: null,
  loading: false,
  error: null,
  validationRules: null,
  validationRulesLoading: false,
  formFields: null,
  formFieldsLoading: false,
};

export const formResponseReducer = createReducer(
  initialState,
  on(FormResponseActions.fetchAllForms, (state) => {
    console.log('📦 Reducer - fetchAllForms - cambiando loading a true');
    return {
      ...state,
      loading: true,
      error: null,
    };
  }),
  on(FormResponseActions.fetchAllFormsSuccess, (state, { forms }) => {
    console.log('📦 Reducer - fetchAllFormsSuccess - guardando formularios:', forms);
    console.log('📦 Reducer - cantidad de formularios:', forms?.length || 0);
    return {
      ...state,
      forms,
      loading: false,
      error: null,
    };
  }),
  on(FormResponseActions.fetchAllFormsFailure, (state, { error }) => ({
    ...state,
    loading: false,
    error,
  })),
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
  })),
  // Casos para reglas de validación
  on(FormResponseActions.loadValidationRules, (state) => ({
    ...state,
    validationRulesLoading: true,
    error: null,
  })),
  on(FormResponseActions.loadValidationRulesSuccess, (state, { formId, validationRules }) => ({
    ...state,
    validationRules: {
      ...state.validationRules,
      [formId]: validationRules
    },
    validationRulesLoading: false,
    error: null,
  })),
  on(FormResponseActions.loadValidationRulesFailure, (state, { error }) => ({
    ...state,
    validationRulesLoading: false,
    error,
  })),
  // Casos para campos de formularios
  on(FormResponseActions.loadFormFields, (state) => ({
    ...state,
    formFieldsLoading: true,
    error: null,
  })),
  on(FormResponseActions.loadFormFieldsSuccess, (state, { formId, fields }) => ({
    ...state,
    formFields: {
      ...state.formFields,
      [formId]: fields
    },
    formFieldsLoading: false,
    error: null,
  })),
  on(FormResponseActions.loadFormFieldsFailure, (state, { error }) => ({
    ...state,
    formFieldsLoading: false,
    error,
  }))
);