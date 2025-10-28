import {Injectable} from '@angular/core';
import {Actions, createEffect, ofType} from '@ngrx/effects';
import {of} from 'rxjs';
import {map, mergeMap, catchError, tap, switchMap} from 'rxjs/operators';
import {FormResponseService} from '../../services/formResponse.service';
import * as FormResponseActions from '../actions/formResponse.actions'; 


@Injectable()
export class FormResponseEffects {

    //fetch forms 

    fetchForms$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.fetchForms),
            mergeMap(() =>
                this.formResponseService.getForms().pipe(
                    map(forms => FormResponseActions.fetchFormsSuccess({ forms })),
                    catchError(error => {
                        console.error('❌ Error al obtener los formularios:', error);
                        return of(FormResponseActions.fetchFormsFailure({ error }));
                    })
                )
            )
        )
    );  

    // fetch validaciones de formularios
    fetchFormValidatorRules$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.fetchForms),
            mergeMap(() =>
                this.formResponseService.getFormValidatorRules().pipe(
                    map(rules => {
                        // Aquí podrías despachar una acción para almacenar las reglas en el estado si es necesario
                        console.log('✅ Reglas de validación obtenidas:', rules);
                        return FormResponseActions.fetchFormsSuccess({ forms: [] }); // Ajusta según tu necesidad
                    }),
                    catchError(error => {
                        console.error('❌ Error al obtener las reglas de validación:', error);
                        return of(FormResponseActions.fetchFormsFailure({ error }));
                    })
                )
            )
        )
    );

    // submit form response
    submitFormResponse$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.submitForm),
            mergeMap(({formData}) =>
                this.formResponseService.submitFormResponse(formData).pipe(
                    // 👇 Aquí capturas y muestras la respuesta en consola
                    tap(response => console.log('✅ Respuesta del backend (form response):', response)),

                    // Si todo va bien, se despacha la acción de éxito
                    map(response => FormResponseActions.submitFormSuccess({response})),

                    // Manejo de errores
                    catchError(error => {
                        console.error('❌ Error en la petición:', error);

                        let errorMessage = 'Error al enviar la respuesta del formulario';

                        if (error?.status === 401) {
                            errorMessage = 'No tiene autorización para enviar la respuesta del formulario. Por favor, verifique sus permisos.';
                            console.error('⚠️ Error de autorización al enviar la respuesta del formulario');        
                        } else if (error?.error?.message) {
                            errorMessage = error.error.message;
                        } else if (typeof error === 'string') {
                            errorMessage = error;
                        }

                        return of(FormResponseActions.submitFormFailure({error: errorMessage}));
                    })
                )
            )
        )
    );


    //fetch respuestas de formularios
    fetchFormResponses$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.fetchForms),
            mergeMap(() =>
                this.formResponseService.getFormResponses().pipe(
                    map(responses => FormResponseActions.fetchFormsSuccess({ forms: responses })),
                    catchError(error => {
                        console.error('❌ Error al obtener las respuestas de formularios:', error);
                        return of(FormResponseActions.fetchFormsFailure({ error }));
                    })
                )
            )
        )
    );

    //responder respuesta de formulario por id
    responseFormReviewById$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.responseFormReviewById),
            mergeMap(({ formId }) =>
                this.formResponseService.responseFormReviewById(formId).pipe(
                    map(response => FormResponseActions.fetchFormsSuccess({ forms: [response] })),
                    catchError(error => {
                        console.error('❌ Error al obtener la respuesta de formulario por ID:', error);
                        return of(FormResponseActions.fetchFormsFailure({ error }));
                    })
                )
            )
        )
    );
    constructor(
        private actions$: Actions,
        private formResponseService: FormResponseService
    ) {}
}