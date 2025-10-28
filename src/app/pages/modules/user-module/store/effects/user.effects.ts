import { Injectable } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap, switchMap } from 'rxjs/operators';
import { UserService } from '../../services/user.service';
import * as UserActions from '../actions/user.actions';

@Injectable()
export class UserEffects {
    fetchUsers$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.fetchUsers),
            mergeMap(() =>
                this.userService.getUsers().pipe(
                    // 👇 Aquí capturas y muestras la respuesta en consola
                    tap(response => console.log('✅ Respuesta del backend (usuarios):', response)),

                    // Si todo va bien, se despacha la acción de éxito
                    map(users => UserActions.fetchUsersSuccess({ users })),

                    // Manejo de errores
                    catchError(error => {
                        console.error('❌ Error en la petición:', error);

                        let errorMessage = 'Error al obtener usuarios';

                        if (error?.status === 401) {
                            errorMessage = 'No tiene autorización para ver los usuarios. Por favor, verifique sus permisos.';
                            console.error('⚠️ Error de autorización al obtener usuarios');
                        } else if (error?.error?.message) {
                            errorMessage = error.error.message;
                        } else if (typeof error === 'string') {
                            errorMessage = error;
                        }

                        return of(UserActions.fetchUsersFailure({ error: errorMessage }));
                    })
                )
            )
        )
    );


    createUser$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.createUser),
            mergeMap(({ user }) =>
                this.userService.createUser(user).pipe(
                    // Usar la respuesta del backend (usuario creado) para actualizar el estado
                    map((createdUser) => UserActions.createUserSuccess({ user: createdUser })),
                    catchError((error) => of(UserActions.createUserFailure({ error })))
                )
            )
        )
    );

    // Después de un createUserSuccess, volver a cargar la lista para asegurar consistencia
    createUserSuccessReload$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.createUserSuccess),
            map(() => UserActions.fetchUsers())
        )
    );

    updateUser$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.updateUser),
            mergeMap(action =>
                this.userService.updateUser(action.id, action.user).pipe(
                    map(user => UserActions.updateUserSuccess({ user })),
                    catchError(error => of(UserActions.updateUserFailure({ error })))
                )
            )
        )
    );

    deleteUser$ = createEffect(() =>
        this.actions$.pipe(
            ofType(UserActions.deleteUser),
            mergeMap(action =>
                this.userService.deleteUser(action.id).pipe(
                    map(() => UserActions.deleteUserSuccess({ id: action.id })),
                    catchError(error => of(UserActions.deleteUserFailure({ error })))
                )
            )
        )
    );

    constructor(
        private actions$: Actions,
        private userService: UserService
    ) { }
}
