import { createAction, props } from '@ngrx/store';
import { UserData } from '../../models/userData.model';

// Fetch Users
export const fetchUsers = createAction('[UsersData] Fetch Users');
export const fetchUsersSuccess = createAction(
    '[UsersData] Fetch Users Success',
    props<{ users: UserData[] }>()
);
export const fetchUsersFailure = createAction(
    '[UsersData] Fetch Users Failure',
    props<{ error: any }>()
);

// Create User
export const createUser = createAction(
    '[UsersData] Create User',
    props<{ user: UserData }>()
);
export const createUserSuccess = createAction(
    '[UsersData] Create User Success',
    props<{ user: UserData }>()
);
export const createUserFailure = createAction(
    '[UsersData] Create User Failure',
    props<{ error: any }>()
);

// Update User
export const updateUser = createAction(
    '[UsersData] Update User',
    props<{ id: number, user: UserData }>()
);
export const updateUserSuccess = createAction(
    '[UsersData] Update User Success',
    props<{ user: UserData }>()
);
export const updateUserFailure = createAction(
    '[UsersData] Update User Failure',
    props<{ error: any }>()
);

// Delete User
export const deleteUser = createAction(
    '[UsersData] Delete User',
    props<{ id: number }>()
);
export const deleteUserSuccess = createAction(
    '[UsersData] Delete User Success',
    props<{ id: number }>()
);
export const deleteUserFailure = createAction(
    '[UsersData] Delete User Failure',
    props<{ error: any }>()
);