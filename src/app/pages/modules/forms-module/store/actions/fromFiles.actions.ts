import { createAction, props } from "@ngrx/store";
import { FormsFiles } from "../../model/forms.model";

export const getFormFiles = createAction(
  "[FormFiles] Get Form Files",
  props<{ formId: number }>()
);  

export const getFormFilesSuccess = createAction(
  "[FormFiles] Get Form Files Success",
  props<{ files: FormsFiles[] }>()
);

export const getFormFilesFailure = createAction(
  "[FormFiles] Get Form Files Failure",
  props<{ error: any }>()
);

export const uploadFormFile = createAction(
  "[FormFiles] Upload Form File",
  props<{ formId: number; fileData: FormData }>()
);

export const uploadFormFileSuccess = createAction(
  "[FormFiles] Upload Form File Success",
  props<{ response: any }>()
);

export const uploadFormFileFailure = createAction(
  "[FormFiles] Upload Form File Failure",
  props<{ error: any }>()
);

export const updateFormFile = createAction(
  "[FormFiles] Update Form File",
  props<{ id: number; formFileData: Partial<FormsFiles> }>()
);

export const updateFormFileSuccess = createAction(
  "[FormFiles] Update Form File Success",
  props<{ response: any }>()
);

export const updateFormFileFailure = createAction(
  "[FormFiles] Update Form File Failure",
  props<{ error: any }>()
);

export const deleteFormFile = createAction(
  "[FormFiles] Delete Form File",
  props<{ fileId: number }>()
);
export const deleteFormFileSuccess = createAction(
  "[FormFiles] Delete Form File Success",
  props<{ response: any }>()
);

export const deleteFormFileFailure = createAction(
  "[FormFiles] Delete Form File Failure",
  props<{ error: any }>()
);

export const clearFormFiles = createAction(
  "[FormFiles] Clear Form Files"
);  