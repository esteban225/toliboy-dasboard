import { createReducer, on } from "@ngrx/store";
import * as FormResponseActions from "../actions/formResponse.actions";
import { FormResponse, FormResponseFilters, PaginationMeta } from "../../model/forms.model";

export interface FormResponseState {
  response: any | null;
  forms: any[] | null;
  loading: boolean;
  error: any | null;
  validationRules: { [formId: number]: any } | null;
  validationRulesLoading: boolean;
  formFields: { [formId: number]: any[] } | null;
  formFieldsLoading: boolean;
  // Form Responses CRUD state
  responses: FormResponse[];
  selectedResponse: FormResponse | null;
  responsesLoading: boolean;
  responsesMeta: PaginationMeta | null;
  currentFilters: FormResponseFilters;
  submitting: boolean;
  reviewing: boolean;
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
  // Form Responses CRUD state
  responses: [],
  selectedResponse: null,
  responsesLoading: false,
  responsesMeta: null,
  currentFilters: { page: 1, per_page: 10 },
  submitting: false,
  reviewing: false,
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
    submitting: true,
    error: null,
  })),
  on(FormResponseActions.submitFormSuccess, (state, { response }) => ({
    ...state,
    response,
    responses: [response, ...state.responses],
    submitting: false,
    error: null,
  })),
  on(FormResponseActions.submitFormFailure, (state, { error }) => ({
    ...state,
    submitting: false,
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
  })),

  // ==================== FORM RESPONSES CRUD ====================
  
  // Load all form responses
  on(FormResponseActions.loadFormResponses, (state, { filters }) => ({
    ...state,
    responsesLoading: true,
    error: null,
    currentFilters: filters || state.currentFilters,
  })),
  on(FormResponseActions.loadFormResponsesSuccess, (state, { paginatedData }) => ({
    ...state,
    responses: paginatedData.data,
    responsesMeta: paginatedData.meta,
    responsesLoading: false,
    error: null,
  })),
  on(FormResponseActions.loadFormResponsesFailure, (state, { error }) => ({
    ...state,
    responsesLoading: false,
    error,
  })),

  // Load single response by ID
  on(FormResponseActions.loadFormResponseById, (state) => ({
    ...state,
    responsesLoading: true,
    error: null,
  })),
  on(FormResponseActions.loadFormResponseByIdSuccess, (state, { response }) => ({
    ...state,
    selectedResponse: response,
    responsesLoading: false,
    error: null,
  })),
  on(FormResponseActions.loadFormResponseByIdFailure, (state, { error }) => ({
    ...state,
    responsesLoading: false,
    error,
  })),

  // Update form response
  on(FormResponseActions.updateFormResponse, (state) => ({
    ...state,
    submitting: true,
    error: null,
  })),
  on(FormResponseActions.updateFormResponseSuccess, (state, { response }) => ({
    ...state,
    responses: state.responses.map(r => r.id === response.id ? response : r),
    selectedResponse: response,
    submitting: false,
    error: null,
  })),
  on(FormResponseActions.updateFormResponseFailure, (state, { error }) => ({
    ...state,
    submitting: false,
    error,
  })),

  // Review form response
  on(FormResponseActions.reviewFormResponse, (state) => ({
    ...state,
    reviewing: true,
    error: null,
  })),
  on(FormResponseActions.reviewFormResponseSuccess, (state, { response }) => ({
    ...state,
    responses: state.responses.map(r => r.id === response.id ? response : r),
    selectedResponse: response,
    reviewing: false,
    error: null,
  })),
  on(FormResponseActions.reviewFormResponseFailure, (state, { error }) => ({
    ...state,
    reviewing: false,
    error,
  })),

  // Clear selected response
  on(FormResponseActions.clearSelectedResponse, (state) => ({
    ...state,
    selectedResponse: null,
  })),

  // Set filters
  on(FormResponseActions.setResponseFilters, (state, { filters }) => ({
    ...state,
    currentFilters: { ...state.currentFilters, ...filters },
  }))
);