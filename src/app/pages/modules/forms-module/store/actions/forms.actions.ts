import { createAction, props } from "@ngrx/store";
import { Forms } from "../../model/forms.model";

export const getForms = createAction(
  "[Forms] Get Forms"
);  

export const getFormsSuccess = createAction(
  "[Forms] Get Forms Success",
  props<{ forms: Forms[] }>()
);

export const getFormsFailure = createAction(
  "[Forms] Get Forms Failure",
  props<{ error: any }>()
);

export const postForm = createAction(
  "[Forms] Post Form",
  props<{ formData: Forms }>()
);

export const postFormSuccess = createAction(
  "[Forms] Post Form Success",
  props<{ response: Forms }>()
);

export const postFormFailure = createAction(
  "[Forms] Post Form Failure",
  props<{ error: any }>()
);

export const putForm = createAction(
  "[Forms] Put Form",
  props<{ id: number; formData: Forms }>()
);

export const putFormSuccess = createAction(
  "[Forms] Put Form Success",
  props<{ response: Forms }>()
);

export const putFormFailure = createAction(
  "[Forms] Put Form Failure",
  props<{ error: any }>()
);

export const deleteForm = createAction(
  "[Forms] Delete Form",
  props<{ id: number }>()
);

export const deleteFormSuccess = createAction(
  "[Forms] Delete Form Success",
  props<{ response: any }>()
);

export const deleteFormFailure = createAction(
  "[Forms] Delete Form Failure",
  props<{ error: any }>()
);
