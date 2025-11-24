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