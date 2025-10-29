import{Injectable} from '@angular/core';  
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { of } from 'rxjs';
import { map, mergeMap, catchError, tap } from 'rxjs/operators';
import { FormsService } from '../../services/forms.service';
import * as FormActions from '../actions/forms.actions';

@Injectable()
export class FormsEffects {
    fetchForms$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.getForms),
            mergeMap(() =>
                this.formsService.getForms().pipe(
                    // 👇 Aquí capturas y muestras la respuesta en consola
                    tap(response => console.log('✅ Respuesta del backend (formularios):', response)),

                    // Si todo va bien, se despacha la acción de éxito
                    map(forms => FormActions.getFormsSuccess({ forms: forms as any })),
                    tap(() => console.log('✅ Formularios obtenidos con éxito')),

                    // Manejo de errores
                    catchError(error => {
                        console.error('❌ Error en la petición:', error);

                        let errorMessage = 'Error al obtener formularios';

                        if (error?.status === 401) {
                            errorMessage = 'No tiene autorización para ver los formularios. Por favor, verifique sus permisos.';
                            console.error('⚠️ Error de autorización al obtener formularios');
                        } else if (error?.error?.message) {
                            errorMessage = error.error.message;
                        } else if (typeof error === 'string') {
                            errorMessage = error;
                        }

                        return of(FormActions.getFormsFailure({ error: errorMessage }));
                    })
                )
            )
        )
    );

    createForm$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.postForm),
            mergeMap(({ formData }) =>
                this.formsService.createForm(formData).pipe(
                    map((createdForm) => FormActions.postFormSuccess({ response: createdForm as any })),
                    catchError(error => of(FormActions.postFormFailure({ error })))
                )
            )
        )
    );  

    createFormSuccessReload$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.postFormSuccess),
            map(() => FormActions.getForms())
        )
    );
    
    updateForm$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.putForm),
            mergeMap(({ id, formData }) =>
                this.formsService.updateForm(id, formData).pipe(
                    map(updatedForm => FormActions.putFormSuccess({ response: updatedForm as any })),
                    catchError(error => of(FormActions.putFormFailure({ error })))
                )
            )
        )
    );

    updateFormSuccessReload$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.putFormSuccess),
            map(() => FormActions.getForms())
        )
    );

    deleteForm$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.deleteForm),
            mergeMap(({ id }) =>
                this.formsService.deleteForm(id).pipe(
                    map(() => FormActions.deleteFormSuccess({ response: id })),
                    catchError(error => of(FormActions.deleteFormFailure({ error })))
                )
            )
        )
    );

    deleteFormSuccessReload$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormActions.deleteFormSuccess),
            map(() => FormActions.getForms())
        )
    );

    constructor(
        private actions$: Actions,
        private formsService: FormsService
    ) {}
}