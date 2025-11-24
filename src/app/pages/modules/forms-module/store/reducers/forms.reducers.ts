import { createReducer, on } from '@ngrx/store';
import { Forms } from '../../model/forms.model';
import * as FormActions from '../actions/forms.actions';

export interface FormState {
    forms: Forms[];
    loading: boolean;
    error: any;
}

export const initialState: FormState = {
    forms: [],
    loading: false,
    error: null
};

export const formReducer = createReducer(
    initialState,
    // Fetch Forms
    on(FormActions.getForms, state => ({
        ...state,
        loading: true
    })),
    on(FormActions.getFormsSuccess, (state, { forms }) => ({
        ...state,
        forms: forms,
        loading: false
    })),
    on(FormActions.getFormsFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Create Form
    on(FormActions.postForm, state => ({
        ...state,
        loading: true
    })),
    on(FormActions.postFormSuccess, (state, { response }) => ({
        ...state,
        form: response,
        loading: false
    })),
    on(FormActions.postFormFailure  , (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Update Form
    on(FormActions.putForm, state => ({
        ...state,
        loading: true
    })),
    on(FormActions.putFormSuccess, (state, { response }) => ({
        ...state,
        form: response,
        loading: false
    })),
    on(FormActions.putFormFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Delete Form
    on(FormActions.deleteForm, state => ({
        ...state,
        loading: true
    })),
    on(FormActions.deleteFormSuccess, (state, { response }) => ({
        ...state,
        forms: state.forms.filter(form => form.id !== response),
        loading: false
    })),
    on(FormActions.deleteFormFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),
);