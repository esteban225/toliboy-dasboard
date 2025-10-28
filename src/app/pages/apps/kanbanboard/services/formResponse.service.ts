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
    private apiUrl = `${environment.AUTH_API}/form-responses`;

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
        // const headers = GlobalComponent.headerToken || '';
        return this.http.get<{ status: boolean; message: string; data: any[] }>(`${this.apiUrl}/forms?per_page=100`).pipe(
            // Extrae solo el arreglo de formularios
            map(response => response.data),
            catchError(this.handleError)
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

    // Enviar una nueva respuesta de formulario
    submitFormResponse(formData: any): Observable<any> {
        return this.http.post<any>(this.apiUrl, formData).pipe(
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
