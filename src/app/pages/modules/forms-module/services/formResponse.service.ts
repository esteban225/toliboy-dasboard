import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
//import {FormResponse}from '../models/formResponse.model';
import { environment } from 'src/environments/environment';
import { GlobalComponent } from 'src/app/global-component';

@Injectable({
    providedIn: 'root'
})
export class FormResponseService {
    private apiUrl = `${environment.AUTH_API}`;

    constructor(private http: HttpClient) {
    }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Ha ocurrido un error en el servidor';
        if (error.error instanceof ErrorEvent) {
            errorMessage = error.error.message;
        } else {
            errorMessage = error.error?.message || error.message;
        }
        return throwError(() => ({ status: error.status, message: errorMessage }));
    }

    // Obtener todos los formularios
    getForms(): Observable<any[]> {
        console.log('🔄 FormResponseService.getForms() - iniciando petición...');
        return this.http.get<{ status: boolean; message: string; data: any[] }>(`${this.apiUrl}/forms?per_page=100`).pipe(
            // Extrae solo el arreglo de formularios
            map(response => {
                console.log('📦 Respuesta completa del backend:', response);
                console.log('📋 Formularios extraídos:', response.data);
                return response.data;
            }),
            tap(forms => {
                console.log('✅ Formularios procesados en servicio:', forms);
                console.log('📊 Cantidad de formularios:', forms?.length || 0);
            }),
            catchError(error => {
                console.error('❌ Error en FormResponseService.getForms():', error);
                return this.handleError(error);
            })
        );
    }

    // Obtener reglas de validación de formularios
    getFormValidatorRules(): Observable<any> {
        // const headers = GlobalComponent.headerToken || '';
        return this.http.get<{ status: boolean; message: string; data: any }>(`${this.apiUrl}/validator-rules`).pipe(
            // Extrae solo las reglas de validación
            map(response => response.data),
            catchError(this.handleError)
        );
    }

    // Obtener reglas de validación para un formulario específico
    getValidationRulesByFormId(formId: number): Observable<any> {
        return this.http.get<{ status: boolean; message: string; data: any }>(`${this.apiUrl}/forms/${formId}/validation-rules`).pipe(
            map(response => response.data),
            tap(rules => console.log(`✅ Reglas de validación para formulario ${formId}:`, rules)),
            catchError(this.handleError)
        );
    }

    // Obtener campos de un formulario específico
    getFormFields(formId: number): Observable<any[]> {
        console.log(`🔄 FormResponseService.getFormFields(${formId}) - iniciando petición...`);
        return this.http.get<{ status: boolean; message: string; data: any[] }>(`${this.apiUrl}/forms/${formId}/fields`).pipe(
            map(response => {
                console.log(`📦 Respuesta de campos para formulario ${formId}:`, response);
                return response.data || [];
            }),
            tap(fields => {
                console.log(`✅ Campos obtenidos para formulario ${formId}:`, fields);
                console.log(`📊 Cantidad de campos: ${fields?.length || 0}`);
            }),
            catchError(error => {
                console.error(`❌ Error al obtener campos para formulario ${formId}:`, error);
                return this.handleError(error);
            })
        );
    }

    // Enviar una nueva respuesta de formulario
    submitFormResponse(formData: any): Observable<any> {
        return this.http.post<any>(`${this.apiUrl}/forms/responses`, formData).pipe(
            // si el backend devuelve { status, message, data: formResponse }
            map((resp) => resp?.data ?? resp),
            catchError(this.handleError)
        );
    }

    // Obtener todas las respuestas de formularios
    getFormResponses(): Observable<any[]> {
        // const headers = GlobalComponent.headerToken || '';
        return this.http.get<{ status: boolean; message: string; data: any[] }>(`${this.apiUrl}?per_page=100`).pipe(
            // Extrae solo el arreglo de respuestas de formularios
            map(response => response.data),
            catchError(this.handleError)
        );
    }

    //responder respuesta de formulario por id
    responseFormReviewById(id: number): Observable<any> {
        return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
            catchError(this.handleError)
        );
    }
}
