import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { environment } from 'src/environments/environment';
import { 
    FormResponse, 
    FormResponseFilters, 
    CreateFormResponsePayload, 
    UpdateFormResponsePayload, 
    ReviewFormResponsePayload,
    PaginatedResponse 
} from '../model/forms.model';

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
            map(response => {
                console.log('📦 Respuesta completa del backend:', response);
                return response.data;
            }),
            tap(forms => {
                console.log('✅ Formularios procesados en servicio:', forms);
            }),
            catchError(error => {
                console.error('❌ Error en FormResponseService.getForms():', error);
                return this.handleError(error);
            })
        );
    }

    // Obtener reglas de validación de formularios
    getFormValidatorRules(): Observable<any> {
        return this.http.get<{ status: boolean; message: string; data: any }>(`${this.apiUrl}/validator-rules`).pipe(
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
            map(response => response.data || []),
            tap(fields => {
                console.log(`✅ Campos obtenidos para formulario ${formId}:`, fields);
            }),
            catchError(error => {
                console.error(`❌ Error al obtener campos para formulario ${formId}:`, error);
                return this.handleError(error);
            })
        );
    }

    // ==================== FORM RESPONSES CRUD ====================

    // Obtener todas las respuestas de formularios con filtros y paginación
    getFormResponses(filters?: FormResponseFilters): Observable<PaginatedResponse<FormResponse>> {
        let params = new HttpParams();
        
        if (filters) {
            if (filters.form_id) params = params.set('form_id', filters.form_id.toString());
            if (filters.user_id) params = params.set('user_id', filters.user_id.toString());
            if (filters.batch_id) params = params.set('batch_id', filters.batch_id.toString());
            if (filters.status) params = params.set('status', filters.status);
            if (filters.page) params = params.set('page', filters.page.toString());
            if (filters.per_page) params = params.set('per_page', filters.per_page.toString());
        }

        return this.http.get<PaginatedResponse<FormResponse>>(`${this.apiUrl}/forms/responses`, { params }).pipe(
            tap(response => console.log('✅ Respuestas de formularios obtenidas:', response)),
            catchError(this.handleError)
        );
    }

    // Obtener una respuesta específica por ID
    getFormResponseById(id: number): Observable<FormResponse> {
        return this.http.get<{ status: boolean; message: string; data: FormResponse }>(`${this.apiUrl}/forms/responses/${id}`).pipe(
            map(response => response.data),
            tap(data => console.log(`✅ Respuesta ${id} obtenida:`, data)),
            catchError(this.handleError)
        );
    }

    // Crear una nueva respuesta de formulario
    submitFormResponse(payload: CreateFormResponsePayload): Observable<FormResponse> {
        return this.http.post<{ status: string; message: string; data: FormResponse }>(`${this.apiUrl}/forms/responses`, payload).pipe(
            map(response => response.data),
            tap(data => console.log('✅ Respuesta de formulario creada:', data)),
            catchError(this.handleError)
        );
    }

    // Actualizar una respuesta de formulario existente
    updateFormResponse(id: number, payload: UpdateFormResponsePayload): Observable<FormResponse> {
        return this.http.put<{ status: boolean; message: string; data: FormResponse }>(`${this.apiUrl}/forms/responses/${id}`, payload).pipe(
            map(response => response.data),
            tap(data => console.log(`✅ Respuesta ${id} actualizada:`, data)),
            catchError(this.handleError)
        );
    }

    // Revisar una respuesta de formulario (aprobar/rechazar)
    reviewFormResponse(id: number, payload: ReviewFormResponsePayload): Observable<FormResponse> {
        return this.http.post<{ status: boolean; message: string; data: FormResponse }>(`${this.apiUrl}/forms/responses/${id}/review`, payload).pipe(
            map(response => response.data),
            tap(data => console.log(`✅ Respuesta ${id} revisada:`, data)),
            catchError(this.handleError)
        );
    }

    // Descargar reporte PDF de un formulario
    downloadFormReportPdf(formId: number): Observable<Blob> {
        return this.http.get(`${this.apiUrl}/forms/${formId}/report/pdf`, {
            responseType: 'blob'
        }).pipe(
            tap(() => console.log(`✅ Descargando PDF para formulario ${formId}`)),
            catchError(this.handleError)
        );
    }

    // Método legacy para compatibilidad
    responseFormReviewById(id: number): Observable<any> {
        return this.getFormResponseById(id);
    }
}
