import { createAction, props } from "@ngrx/store";
import { DataUser } from "../../models/userData.model";

// Fetch Users contacts

export const fetchUserContacts = createAction("[UserContacts] Fetch User Contacts");
export const fetchUserContactsSuccess = createAction(
  "[UserContacts] Fetch User Contacts Success",
  props<{ userContacts: DataUser[] }>()
);
export const fetchUserContactsFailure = createAction(
  "[UserContacts] Fetch User Contacts Failure",
  props<{ error: any }>()
);

//Fetch User contact by ID
export const fetchUserContactById = createAction(
  "[UserContacts] Fetch User Contact By ID",
  props<{ id: number }>()
);
export const fetchUserContactByIdSuccess = createAction(
  "[UserContacts] Fetch User Contact By ID Success",
  props<{ userContact: DataUser }>()
);
export const fetchUserContactByIdFailure = createAction(
  "[UserContacts] Fetch User Contact By ID Failure",
  props<{ error: any }>()
);

// Create User contact
export const createUserContact = createAction(
  "[UserContacts] Create User Contact",
  props<{ userContact: DataUser }>()
);
export const createUserContactSuccess = createAction(
  "[UserContacts] Create User Contact Success",
  props<{ userContact: DataUser }>()
);
export const createUserContactFailure = createAction(
  "[UserContacts] Create User Contact Failure",
  props<{ error: any }>()
);

// Update User contact
export const updateUserContact = createAction(
  "[UserContacts] Update User Contact",
  props<{ id: number; userContact: DataUser }>()
);
export const updateUserContactSuccess = createAction(
  "[UserContacts] Update User Contact Success",
  props<{ userContact: DataUser }>()
);
export const updateUserContactFailure = createAction(
  "[UserContacts] Update User Contact Failure",
  props<{ error: any }>()
);

// Delete User contact
export const deleteUserContact = createAction(
  "[UserContacts] Delete User Contact",
  props<{ id: number }>()
);
export const deleteUserContactSuccess = createAction(
  "[UserContacts] Delete User Contact Success",
  props<{ id: number }>()
);
export const deleteUserContactFailure = createAction(
  "[UserContacts] Delete User Contact Failure",
  props<{ error: any }>()
);