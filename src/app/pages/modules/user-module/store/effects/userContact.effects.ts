import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { of } from "rxjs";
import { map, mergeMap, catchError, tap, switchMap } from "rxjs/operators";
import { UserContactService } from "../../services/userContact.service";
import * as UserContactActions from "../actions/userContact.actions";

@Injectable()
export class UserContactEffects {
    fetchUserContacts$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserContactActions.fetchUserContacts),
            mergeMap(() =>
                this.userContactService.getUserContacts().pipe(
                    // 👇 Aquí capturas y muestras la respuesta en consola
                    tap((response) =>
                        console.log("✅ Respuesta del backend (user contacts):", response)
                    ),

                    // Si todo va bien, se despacha la acción de éxito
                    map((userContacts) =>
                        UserContactActions.fetchUserContactsSuccess({ userContacts })
                    ),

                    // Manejo de errores
                    catchError((error) => {
                        console.error("❌ Error en la petición:", error);

                        let errorMessage = "Error al obtener contactos de usuario";

                        if (error?.status === 401) {
                            errorMessage =
                                "No tiene autorización para ver los contactos de usuario. Por favor, verifique sus permisos.";
                            console.error(
                                "⚠️ Error de autorización al obtener contactos de usuario"
                            );
                        } else if (error?.error?.message) {
                            errorMessage = error.error.message;
                        } else if (typeof error === "string") {
                            errorMessage = error;
                        }

                        return of(
                            UserContactActions.fetchUserContactsFailure({
                                error: errorMessage,
                            })
                        );
                    })
                )
            )
        )
    );

    createUserContact$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserContactActions.createUserContact),
            mergeMap(({ userContact }) =>
                this.userContactService.createUserContact(userContact).pipe(
                    // Usar la respuesta del backend (contacto de usuario creado) para actualizar el estado
                    map((createdUserContact) =>
                        UserContactActions.createUserContactSuccess({
                            userContact: createdUserContact,
                        })
                    ),
                    catchError((error) =>
                        of(UserContactActions.createUserContactFailure({ error }))
                    )
                )
            )
        )
    );
    getUserContactById$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserContactActions.fetchUserContactById),
            mergeMap(({ id }) =>
                this.userContactService.getUserContactById(id).pipe(
                    map((userContact) =>
                        UserContactActions.fetchUserContactByIdSuccess({ userContact })
                    ),
                    catchError((error) =>
                        of(UserContactActions.fetchUserContactByIdFailure({ error }))
                    )
                )
            )
        )
    );

    updateUserContact$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserContactActions.updateUserContact),
            mergeMap((action) =>
                this.userContactService
                    .updateUserContact(action.id, action.userContact)
                    .pipe(
                        map((userContact) =>
                            UserContactActions.updateUserContactSuccess({ userContact })
                        ),
                        catchError((error) =>
                            of(UserContactActions.updateUserContactFailure({ error }))
                        )
                    )
            )
        )
    );

    deleteUserContact$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserContactActions.deleteUserContact),
            mergeMap((action) =>
                this.userContactService.deleteUserContact(action.id).pipe(
                    map(() =>
                        UserContactActions.deleteUserContactSuccess({ id: action.id })
                    ),
                    catchError((error) =>
                        of(UserContactActions.deleteUserContactFailure({ error }))
                    )
                )
            )
        )
    );

    constructor(
        private actions$: Actions,
        private userContactService: UserContactService
    ) {}
}