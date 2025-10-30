import { Injectable } from "@angular/core";
import { Actions, createEffect, ofType } from "@ngrx/effects";
import { of } from "rxjs";
import { map, mergeMap, catchError, tap } from "rxjs/operators";
import { FormFilesService } from "../../services/formFiles.service";
import * as FormFilesActions from "../actions/fromFiles.actions";

@Injectable()
export class FormFilesEffects {
    fetchFormFiles$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormFilesActions.getFormFiles),
            mergeMap(({ formId }) =>
                this.formFilesService.getFormFiles(formId).pipe(
                    tap(response => console.log('✅ Respuesta del backend (archivos de formularios):', response)),
                    map(files => FormFilesActions.getFormFilesSuccess({ files: files as any })),
                    tap(() => console.log('✅ Archivos de formularios obtenidos con éxito')),
                    catchError(error => {
                        console.error('❌ Error en la petición:', error);

                        let errorMessage = 'Error al obtener archivos de formularios';

                        if (error?.status === 401) {
                            errorMessage = 'No tiene autorización para ver los archivos de formularios. Por favor, verifique sus permisos.';
                            console.error('⚠️ Error de autorización al obtener archivos de formularios');
                        } else if (error?.error?.message) {
                            errorMessage = error.error.message;
                        } else if (typeof error === 'string') {
                            errorMessage = error;
                        }

                        return of(FormFilesActions.getFormFilesFailure({ error: errorMessage }));
                    })
                )
            )
        )
    );

    createFile$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormFilesActions.uploadFormFile),
            mergeMap(({ formId, fileData }) =>
                this.formFilesService.uploadFormFile(formId, fileData as any).pipe(
                    map((response) => FormFilesActions.uploadFormFileSuccess({ response: response as any })),
                    catchError(error => of(FormFilesActions.uploadFormFileFailure({ error })))
                )
            )
        )
    );

    deleteFile$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormFilesActions.deleteFormFile),
            mergeMap(({ fileId }) =>
                this.formFilesService.deleteFormFile(fileId).pipe(
                    map((response) => FormFilesActions.deleteFormFileSuccess({ response: response as any })),
                    catchError(error => of(FormFilesActions.deleteFormFileFailure({ error })))
                )
            )
        )
    );

    constructor(
        private actions$: Actions,
        private formFilesService: FormFilesService
    ) {}
}   