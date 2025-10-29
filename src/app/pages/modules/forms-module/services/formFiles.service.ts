import { Injectable } from "@angular/core";
import { HttpClient, HttpErrorResponse } from "@angular/common/http";
import { Observable, throwError } from "rxjs";
import { catchError, tap, map } from "rxjs/operators";
import { FormsFiles } from "../model/forms.model";
import { environment } from "src/environments/environment";

@Injectable({
    providedIn: 'root'
})
export class FormFilesService {
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

    // Form Files CRUD
    getFormFiles(formId: number): Observable<FormsFiles[]> {
        return this.http.get<{ status: boolean; message: string; data: FormsFiles[] }>(`${this.apiUrl}/${formId}/fields`).pipe(
            // Extrae solo el arreglo de archivos de formularios
            map(response => response.data),
            tap(files => console.log('Form files fetched:', files)),
            catchError(this.handleError)
        );
    }   
    uploadFormFile(formId: number, fileData: Partial<FormsFiles>): Observable<FormsFiles> {
        return this.http.post<any>(`${this.apiUrl}/${formId}/files`, fileData).pipe(
            // si el backend devuelve { status, message, data: file }
            map((resp) => resp?.data ?? resp),
            catchError(this.handleError)
        );
    }

    deleteFormFile( fileId: number): Observable<any> {
        const url = `${this.apiUrl}/files/${fileId}`;
        return this.http.delete<any>(url).pipe(
            catchError(this.handleError)
        );
    }
}