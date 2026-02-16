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
            ofType(FormResponseActions.fetchAllForms),
            tap(() => console.log('🎯 Efecto fetchForms$ - acción fetchAllForms detectada')),
            mergeMap(() =>
                this.formResponseService.getForms().pipe(
                    tap(forms => {
                        console.log('🎯 Efecto fetchForms$ - formularios recibidos del servicio:', forms);
                        console.log('🎯 Efecto fetchForms$ - cantidad:', forms?.length || 0);
                    }),
                    map(forms => {
                        const action = FormResponseActions.fetchAllFormsSuccess({ forms });
                        console.log('🎯 Efecto fetchForms$ - despachando fetchAllFormsSuccess con:', action);
                        return action;
                    }),
                    catchError(error => {
                        console.error('❌ Error en efecto fetchForms$:', error);
                        return of(FormResponseActions.fetchAllFormsFailure({ error }));
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


    //fetch respuestas de formularios (legacy - usa el nuevo endpoint paginado)
    fetchFormResponses$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.fetchForms),
            mergeMap(() =>
                this.formResponseService.getFormResponses().pipe(
                    map(paginatedResponse => FormResponseActions.fetchFormsSuccess({ forms: paginatedResponse.data || [] })),
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

    // cargar reglas de validación para un formulario específico
    loadValidationRules$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.loadValidationRules),
            switchMap(({ formId }) =>
                this.formResponseService.getValidationRulesByFormId(formId).pipe(
                    tap(rules => console.log(`✅ Reglas de validación obtenidas para formulario ${formId}:`, rules)),
                    map(validationRules => FormResponseActions.loadValidationRulesSuccess({ formId, validationRules })),
                    catchError(error => {
                        console.error(`❌ Error al obtener reglas de validación para formulario ${formId}:`, error);
                        return of(FormResponseActions.loadValidationRulesFailure({ formId, error }));
                    })
                )
            )
        )
    );

    // cargar campos de un formulario específico
    loadFormFields$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.loadFormFields),
            switchMap(({ formId }) =>
                this.formResponseService.getFormFields(formId).pipe(
                    tap(fields => console.log(`✅ Campos obtenidos para formulario ${formId}:`, fields)),
                    map(fields => FormResponseActions.loadFormFieldsSuccess({ formId, fields })),
                    catchError(error => {
                        console.error(`❌ Error al obtener campos para formulario ${formId}:`, error);
                        return of(FormResponseActions.loadFormFieldsFailure({ formId, error }));
                    })
                )
            )
        )
    );

    // ==================== FORM RESPONSES CRUD ====================

    // Load all form responses with filters
    loadFormResponses$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.loadFormResponses),
            switchMap(({ filters }) =>
                this.formResponseService.getFormResponses(filters).pipe(
                    tap(response => console.log('✅ Respuestas de formularios obtenidas:', response)),
                    map(paginatedData => FormResponseActions.loadFormResponsesSuccess({ paginatedData })),
                    catchError(error => {
                        console.error('❌ Error al obtener respuestas de formularios:', error);
                        return of(FormResponseActions.loadFormResponsesFailure({ error }));
                    })
                )
            )
        )
    );

    // Load single response by ID
    loadFormResponseById$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.loadFormResponseById),
            switchMap(({ id }) =>
                this.formResponseService.getFormResponseById(id).pipe(
                    tap(response => console.log(`✅ Respuesta ${id} obtenida:`, response)),
                    map(response => FormResponseActions.loadFormResponseByIdSuccess({ response })),
                    catchError(error => {
                        console.error(`❌ Error al obtener respuesta ${id}:`, error);
                        return of(FormResponseActions.loadFormResponseByIdFailure({ error }));
                    })
                )
            )
        )
    );

    // Update form response
    updateFormResponse$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.updateFormResponse),
            switchMap(({ id, payload }) =>
                this.formResponseService.updateFormResponse(id, payload).pipe(
                    tap(response => console.log(`✅ Respuesta ${id} actualizada:`, response)),
                    map(response => FormResponseActions.updateFormResponseSuccess({ response })),
                    catchError(error => {
                        console.error(`❌ Error al actualizar respuesta ${id}:`, error);
                        return of(FormResponseActions.updateFormResponseFailure({ error }));
                    })
                )
            )
        )
    );

    // Review form response
    reviewFormResponse$ = createEffect(() =>
        this.actions$.pipe(
            ofType(FormResponseActions.reviewFormResponse),
            switchMap(({ id, payload }) =>
                this.formResponseService.reviewFormResponse(id, payload).pipe(
                    tap(response => console.log(`✅ Respuesta ${id} revisada:`, response)),
                    map(response => FormResponseActions.reviewFormResponseSuccess({ response })),
                    catchError(error => {
                        console.error(`❌ Error al revisar respuesta ${id}:`, error);
                        return of(FormResponseActions.reviewFormResponseFailure({ error }));
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