import { createAction, props } from '@ngrx/store'


// submit form actions
export const submitForm = createAction(
    '[Form] Submit',
    props<{ formData: any }>()
);

export const submitFormSuccess = createAction(
    '[Form] Submit Success',
    props<{ response: any }>()
);

export const submitFormFailure = createAction(
    '[Form] Submit Failure',
    props<{ error: any }>()
);

//fetch  all forms
export const fetchAllForms = createAction(
    '[Form] Fetch All Forms'
);

export const fetchAllFormsSuccess = createAction(
    '[Form] Fetch All Forms Success',
    props<{ forms: any[] }>()
);

export const fetchAllFormsFailure = createAction(
    '[Form] Fetch All Forms Failure',
    props<{ error: any }>()
);

// load validation rules actions
export const loadValidationRules = createAction(
    '[Forms] Load Validation Rules',
    props<{ formId: number }>()
);

export const loadValidationRulesSuccess = createAction(
    '[Forms] Load Validation Rules Success',
    props<{ formId: number; validationRules: any }>()
);

export const loadValidationRulesFailure = createAction(
    '[Forms] Load Validation Rules Failure',
    props<{ formId: number; error: any }>()
);

// load form fields actions
export const loadFormFields = createAction(
    '[Forms] Load Form Fields',
    props<{ formId: number }>()
);

export const loadFormFieldsSuccess = createAction(
    '[Forms] Load Form Fields Success',
    props<{ formId: number; fields: any[] }>()
);

export const loadFormFieldsFailure = createAction(
    '[Forms] Load Form Fields Failure',
    props<{ formId: number; error: any }>()
);

// fetch forms actions
export const fetchForms = createAction(
    '[Form] Fetch Forms',
    props<{ formId: string }>()
);

export const fetchFormsSuccess = createAction(
    '[Form] Fetch Forms Success',
    props<{ forms: any[] }>()
);

export const fetchFormsFailure = createAction(
    '[Form] Fetch Forms Failure',
    props<{ error: any }>()
);

// response form review by id actions
export const responseFormReviewById = createAction(
    '[Form] Response Form Review By Id',
    props<{ formId: number }>()
);

export const responseFormReviewByIdSuccess = createAction(
    '[Form] Response Form Review By Id Success',
    props<{ response: any }>()
);

export const responseFormReviewByIdFailure = createAction(
    '[Form] Response Form Review By Id Failure',
    props<{ error: any }>()
);