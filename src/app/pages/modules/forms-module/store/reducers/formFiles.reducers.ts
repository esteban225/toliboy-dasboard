import { createReducer, on  } from "@ngrx/store";
import { FormsFiles } from "../../model/forms.model";
import * as FormFilesActions from "../actions/fromFiles.actions";

export interface FormFilesState {
  files: FormsFiles[];
  loading: boolean;
  error: any;
}

export const initialFormFilesState: FormFilesState = {
  files: [],
  loading: false,
  error: null
};

export const formFilesReducer = createReducer(
  initialFormFilesState,
  // Fetch Form Files
  on(FormFilesActions.getFormFiles, (state) => ({
    ...state,
    loading: true
  })),
  on(FormFilesActions.getFormFilesSuccess, (state, { files }) => ({
    ...state,
    files: files,
    loading: false
  })),
  on(FormFilesActions.getFormFilesFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Upload Form File
  on(FormFilesActions.uploadFormFile, (state) => ({
    ...state,
    loading: true
  })),
  on(FormFilesActions.uploadFormFileSuccess, (state, { response }) => ({
    ...state,
    // Optionally, you can add the new file to the files array
    loading: false
  })),
  on(FormFilesActions.uploadFormFileFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Delete Form File
  on(FormFilesActions.deleteFormFile, (state) => ({
    ...state,
    loading: true
  })),
  on(FormFilesActions.deleteFormFileSuccess, (state, { response }) => ({
    ...state,
    // Optionally, you can remove the deleted file from the files array
    loading: false
  })),
  on(FormFilesActions.deleteFormFileFailure, (state, { error }) => ({
    ...state,
    error,
    loading: false
  })),

  // Clear Form Files
  on(FormFilesActions.clearFormFiles, (state) => ({
    ...state,
    files: [],
    error: null,
    loading: false
  }))
);  