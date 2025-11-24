import {Injectable} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { Forms} from '../model/forms.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class FormsService {
    private apiUrl = `${environment.AUTH_API}/forms`;

    constructor(private http: HttpClient) { }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Ha ocurrido un error en el servidor';
        if (error.error instanceof ErrorEvent) {
            errorMessage = error.error.message;
        } else {
            errorMessage = error.error?.message || error.message;
        }
        return throwError(() => ({ status: error.status, message: errorMessage }));
    }

    // Forms CRUD
    getForms(): Observable<Forms[]> {
        return this.http.get<{ status: boolean; message: string; data: Forms[] }>(`${this.apiUrl}?per_page=100`).pipe(
            // Extrae solo el arreglo de formularios
            map(response => response.data),
            tap(forms => console.log('Forms fetched:', forms)),
            catchError(this.handleError)
        );
    }

    getFormById(id: number): Observable<Forms> {
        return this.http.get<Forms>(`${this.apiUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    createForm(formData: Partial<Forms>): Observable<Forms> {
        return this.http.post<any>(this.apiUrl, formData).pipe(
            // si el backend devuelve { status, message, data: form }
            map((resp) => resp?.data ?? resp),
            catchError(this.handleError)
        );
    }

    updateForm(id: number, formData: Partial<Forms>): Observable<Forms> {
        const url = `${this.apiUrl}/${id}`;
        return this.http.put<any>(url, formData).pipe(
            map((resp) => {
                if (typeof resp === 'boolean') {
                    return { id } as Forms;
                } else if (resp.data) {
                    return resp.data;
                } else if (resp.form) {
                    return resp.form;
                } else {
                    return resp;
                }
            }),
            catchError(this.handleError)
        );
    }

    deleteForm(id: number): Observable<number> {
        const url = `${this.apiUrl}/${id}`;
        return this.http.delete<any>(url).pipe(
            map((resp) => {
                if (typeof resp === 'boolean') {
                    return id;
                } else if (resp.data && resp.data.id) {
                    return resp.data.id;
                } else {
                    return id;
                }
            }),
            catchError(this.handleError)
        );
    }
}   