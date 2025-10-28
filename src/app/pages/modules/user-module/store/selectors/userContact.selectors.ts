import { createFeatureSelector, createSelector } from "@ngrx/store";
import { UserContactState } from "../reducers/userContact.reducer";

export const selectUserContactState = createFeatureSelector<UserContactState>('userContacts');

export const selectAllUserContacts = createSelector(
    selectUserContactState,
    (state: UserContactState) => state.userContacts
);

export const selectUserContactsLoading = createSelector(
    selectUserContactState,
    (state: UserContactState) => state.loading
);

export const selectUserContactsError = createSelector(
    selectUserContactState,
    (state: UserContactState) => state.error
);
