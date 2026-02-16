import {createFeatureSelector, createSelector} from '@ngrx/store'
import {FormResponseState} from '../reducers/formResponse.reducers'

export const selectFormResponseState = createFeatureSelector<FormResponseState>('formResponse');


// Selector para obtener la matriz de formularios del estado
export const selectForms = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.forms || []
);
export const selectFormError = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.error
);

export const selectFormLoading = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.loading
);
export const selectFormSuccess = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => !!state.response
);




//Selector para obtener la matriz de las respuestas de formularios del estado
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
  (state: FormResponseState) => state.validationRules
);

export const selectValidationRulesLoading = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.validationRulesLoading
);

// Selector para obtener reglas de validación de un formulario específico
export const selectValidationRulesByFormId = (formId: number) => createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.validationRules ? state.validationRules[formId] : null
);

// Selectores para campos de formularios
export const selectFormFields = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.formFields
);

export const selectFormFieldsLoading = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.formFieldsLoading
);

// Selector para obtener campos de un formulario específico
export const selectFormFieldsByFormId = (formId: number) => createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.formFields ? state.formFields[formId] : null
);

// ==================== FORM RESPONSES CRUD SELECTORS ====================

// Selector para obtener todas las respuestas de formularios
export const selectAllResponses = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.responses
);

// Selector para obtener la respuesta seleccionada
export const selectSelectedResponse = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.selectedResponse
);

// Selector para obtener el estado de carga de respuestas
export const selectResponsesLoading = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.responsesLoading
);

// Selector para obtener metadatos de paginación
export const selectResponsesMeta = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.responsesMeta
);

// Selector para obtener los filtros actuales
export const selectCurrentFilters = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.currentFilters
);

// Selector para obtener el estado de envío
export const selectSubmitting = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.submitting
);

// Selector para obtener el estado de revisión
export const selectReviewing = createSelector(
  selectFormResponseState,
  (state: FormResponseState) => state.reviewing
);

// Selector para obtener respuestas por estado
export const selectResponsesByStatus = (status: string) => createSelector(
  selectAllResponses,
  (responses) => responses.filter(r => r.status === status)
);

// Selector para contar respuestas por estado
export const selectResponsesCountByStatus = createSelector(
  selectAllResponses,
  (responses) => {
    return {
      pending: responses.filter(r => r.status === 'pending').length,
      in_progress: responses.filter(r => r.status === 'in_progress').length,
      completed: responses.filter(r => r.status === 'completed').length,
      approved: responses.filter(r => r.status === 'approved').length,
      rejected: responses.filter(r => r.status === 'rejected').length,
      total: responses.length
    };
  }
);