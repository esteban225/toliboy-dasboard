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
        console.log('🚀 Uploading form file to API:', { formId, fileData });
        return this.http.post<any>(`${this.apiUrl}/${formId}/fields`, fileData).pipe(
            // si el backend devuelve { status, message, data: file }
            map((resp) => {
                console.log('✅ Upload response:', resp);
                return resp?.data ?? resp;
            }),
            tap(result => console.log('📁 File uploaded successfully:', result)),
            catchError(this.handleError)
        );
    }

    updateFormFile(formId: number, fieldId: number, fileData: Partial<FormsFiles>): Observable<FormsFiles> {
        console.log('🚀 Updating form file:', { formId, fieldId, fileData });
        const url = `${this.apiUrl}/${formId}/fields/${fieldId}`;
        return this.http.put<any>(url, fileData).pipe(
            map((resp) => {
                console.log('✅ Update response:', resp);
                if (resp?.success) {
                    // Si la respuesta es exitosa, devolver el campo actualizado
                    return { id: fieldId, ...fileData } as FormsFiles;
                } else if (resp?.data) {
                    return resp.data;
                } else if (resp?.field) {
                    return resp.field;
                } else {
                    return { id: fieldId, ...fileData } as FormsFiles;
                }
            }),
            tap(result => console.log('📁 File updated successfully:', result)),
            catchError(this.handleError)
        );
    }

    deleteFormFile(formId: number, fieldId: number): Observable<any> {
        console.log('🚀 Deleting form file:', { formId, fieldId });
        const url = `${this.apiUrl}/${formId}/fields/${fieldId}`;
        return this.http.delete<any>(url).pipe(
            tap(result => console.log('🗑️ File deleted successfully:', result)),
            catchError(this.handleError)
        );
    }
}