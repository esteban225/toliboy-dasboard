import { createFeatureSelector, createSelector } from '@ngrx/store';
import { UserState } from '../reducers/user.reducer';

export const selectUserState = createFeatureSelector<UserState>('users');

export const selectAllUsers = createSelector(
    selectUserState,
    (state: UserState) => state.users
);

export const selectUsersLoading = createSelector(
    selectUserState,
    (state: UserState) => state.loading
);

export const selectUsersError = createSelector(
    selectUserState,
    (state: UserState) => state.error
);

// Selector combinado para obtener todo el estado de usuarios
export const selectUserViewModel = createSelector(
  selectUserState,
  (state) => ({
    users: state.users,
    loading: state.loading,
    error: state.error,
  })
);