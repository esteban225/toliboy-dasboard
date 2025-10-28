import { createReducer, on } from "@ngrx/store";
import { DataUser } from "../../models/userData.model";
import * as UserContactActions from "../actions/userContact.actions";

export interface UserContactState {
    userContacts: DataUser[];
    loading: boolean;
    error: any;
}

export const initialState: UserContactState = {
    userContacts: [],
    loading: false,
    error: null,
};

export const userContactReducer = createReducer(
    initialState,
    // Fetch User Contacts
    on(UserContactActions.fetchUserContacts, (state) => ({
        ...state,
        loading: true,
    })),
    on(
        UserContactActions.fetchUserContactsSuccess,
        (state, { userContacts }) => ({
            ...state,
            userContacts,
            loading: false,
        })
    ),
    on(
        UserContactActions.fetchUserContactsFailure,
        (state, { error }) => ({
            ...state,
            error,
            loading: false,
        })
    ),
    // Fetch User Contact By ID
    on(UserContactActions.fetchUserContactById, (state) => ({
        ...state,
        loading: true,
    })),
    on(
        UserContactActions.fetchUserContactByIdSuccess,
        (state, { userContact }) => ({
            ...state,
            userContacts: state.userContacts.map((contact) =>
                contact.id === userContact.id ? userContact : contact
            ),
            loading: false,
        })
    ),
    on(
        UserContactActions.fetchUserContactByIdFailure,
        (state, { error }) => ({
            ...state,
            error,
            loading: false,
        })
    ),
    // Create User Contact
    on(UserContactActions.createUserContact, (state) => ({
        ...state,
        loading: true,
    })),
    on(
        UserContactActions.createUserContactSuccess,
        (state, { userContact }) => ({
            ...state,
            userContacts: [...state.userContacts, userContact],
            loading: false,
        })
    ),
    on(
        UserContactActions.createUserContactFailure,
        (state, { error }) => ({
            ...state,
            error,
            loading: false,
        })
    ),
    // Fetch Update User Contact
    on(UserContactActions.updateUserContact, (state) => ({
        ...state,
        loading: true,
    })),
    on(
        UserContactActions.updateUserContactSuccess,
        (state, { userContact }) => ({
            ...state,
            userContacts: state.userContacts.map((contact) =>
                contact.id === userContact.id ? userContact : contact
            ),
            loading: false,
        })
    ),
    on(
        UserContactActions.updateUserContactFailure,
        (state, { error }) => ({
            ...state,
            error,
            loading: false,
        })
    ),

    // Delete User Contact
    on(
        UserContactActions.deleteUserContactSuccess,
        (state, { id }) => ({
            ...state,
            userContacts: state.userContacts.filter(
                (contact) => contact.id !== id
            ),
            loading: false,
        })
    ),
    on(
        UserContactActions.deleteUserContactFailure,
        (state, { error }) => ({
            ...state,
            error,
            loading: false,
        })
    ),
);  