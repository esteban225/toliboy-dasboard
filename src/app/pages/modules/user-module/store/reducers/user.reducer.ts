import { createReducer, on } from '@ngrx/store';
import { UserData } from '../../models/userData.model';
import * as UserActions from '../actions/user.actions';

export interface UserState {
    users: UserData[];
    loading: boolean;
    error: any;
}

export const initialState: UserState = {
    users: [],
    loading: false,
    error: null
};

export const userReducer = createReducer(
    initialState,
    // Fetch Users
    on(UserActions.fetchUsers, state => ({
        ...state,
        loading: true
    })),
    on(UserActions.fetchUsersSuccess, (state, { users }) => ({
        ...state,
        users,
        loading: false
    })),
    on(UserActions.fetchUsersFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Create User
    on(UserActions.createUser, state => ({
        ...state,
        loading: true
    })),
    on(UserActions.createUserSuccess, (state, { user }) => ({
        ...state,
        users: [...state.users, user],
        loading: false
    })),
    on(UserActions.createUserFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Update User
    on(UserActions.updateUser, state => ({
        ...state,
        loading: true
    })),
    on(UserActions.updateUserSuccess, (state, { user }) => ({
        ...state,
        users: state.users.map(u => u.id === user.id ? user : u),
        loading: false
    })),
    on(UserActions.updateUserFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    })),

    // Delete User
    on(UserActions.deleteUser, state => ({
        ...state,
        loading: true
    })),
    on(UserActions.deleteUserSuccess, (state, { id }) => ({
        ...state,
        users: state.users.filter(user => user.id !== id),
        loading: false
    })),
    on(UserActions.deleteUserFailure, (state, { error }) => ({
        ...state,
        error,
        loading: false
    }))
);