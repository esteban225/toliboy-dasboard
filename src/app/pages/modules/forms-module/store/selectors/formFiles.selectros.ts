import { createFeatureSelector, createSelector } from "@ngrx/store";
import { FormFilesState } from "../reducers/formFiles.reducers";

export const selectFormFilesState = createFeatureSelector<FormFilesState>('formFiles');

export const selectAllFormFiles = createSelector(
    selectFormFilesState,
    (state: FormFilesState) => state.files
);

export const selectFormFilesLoading = createSelector(
    selectFormFilesState,
    (state: FormFilesState) => state.loading
);

export const selectFormFilesError = createSelector(
    selectFormFilesState,
    (state: FormFilesState) => state.error
);              