import { createAction, props } from '@ngrx/store'
import { 
    FormResponse, 
    FormResponseFilters, 
    CreateFormResponsePayload, 
    UpdateFormResponsePayload, 
    ReviewFormResponsePayload,
    PaginatedResponse 
} from '../../model/forms.model';


// submit form actions
export const submitForm = createAction(
    '[Form] Submit',
    props<{ formData: CreateFormResponsePayload }>()
);

export const submitFormSuccess = createAction(
    '[Form] Submit Success',
    props<{ response: FormResponse }>()
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

// ==================== FORM RESPONSES CRUD ====================

// Load all form responses with filters and pagination
export const loadFormResponses = createAction(
    '[FormResponses] Load Responses',
    props<{ filters?: FormResponseFilters }>()
);

export const loadFormResponsesSuccess = createAction(
    '[FormResponses] Load Responses Success',
    props<{ paginatedData: PaginatedResponse<FormResponse> }>()
);

export const loadFormResponsesFailure = createAction(
    '[FormResponses] Load Responses Failure',
    props<{ error: any }>()
);

// Load single form response by ID
export const loadFormResponseById = createAction(
    '[FormResponses] Load Response By Id',
    props<{ id: number }>()
);

export const loadFormResponseByIdSuccess = createAction(
    '[FormResponses] Load Response By Id Success',
    props<{ response: FormResponse }>()
);

export const loadFormResponseByIdFailure = createAction(
    '[FormResponses] Load Response By Id Failure',
    props<{ error: any }>()
);

// Update form response
export const updateFormResponse = createAction(
    '[FormResponses] Update Response',
    props<{ id: number; payload: UpdateFormResponsePayload }>()
);

export const updateFormResponseSuccess = createAction(
    '[FormResponses] Update Response Success',
    props<{ response: FormResponse }>()
);

export const updateFormResponseFailure = createAction(
    '[FormResponses] Update Response Failure',
    props<{ error: any }>()
);

// Review form response (approve/reject)
export const reviewFormResponse = createAction(
    '[FormResponses] Review Response',
    props<{ id: number; payload: ReviewFormResponsePayload }>()
);

export const reviewFormResponseSuccess = createAction(
    '[FormResponses] Review Response Success',
    props<{ response: FormResponse }>()
);

export const reviewFormResponseFailure = createAction(
    '[FormResponses] Review Response Failure',
    props<{ error: any }>()
);

// Clear selected response
export const clearSelectedResponse = createAction(
    '[FormResponses] Clear Selected Response'
);

// Set current filters
export const setResponseFilters = createAction(
    '[FormResponses] Set Filters',
    props<{ filters: FormResponseFilters }>()
);