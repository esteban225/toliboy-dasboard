import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { GlobalComponent } from 'src/app/global-component';
import { Batch, PaginationMeta } from '../models/batch.model';

interface ApiResponse<T> {
  data: T;
  meta?: PaginationMeta;
  message?: string;
  success?: boolean;
  errors?: Record<string, string[]>;
}

@Injectable({
  providedIn: 'root'
})
export class BatchesService {
  private apiUrl = `${GlobalComponent.API_URL}batches`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    // GlobalComponent.headerToken contains the Authorization header and content-type
    const headersObj: any = GlobalComponent.headerToken || {};
    return new HttpHeaders(headersObj);
  }

  list(filters: Record<string, any> = {}, page: number = 1, perPage: number = 99): Observable<ApiResponse<Batch[]>> {
    let params = new HttpParams()
      .set('page', page.toString())
      .set('per_page', perPage.toString());

    // Agregar filtros opcionales
    Object.keys(filters).forEach(key => {
      if (filters[key]) {
        params = params.set(key, filters[key]);
      }
    });

    return this.http.get<ApiResponse<Batch[]>>(this.apiUrl, {
      params,
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  getById(id: number): Observable<ApiResponse<Batch>> {
    return this.http.get<ApiResponse<Batch>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  create(payload: Partial<Batch>): Observable<ApiResponse<Batch>> {
    return this.http.post<ApiResponse<Batch>>(this.apiUrl, payload, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  update(id: number, payload: Partial<Batch>): Observable<ApiResponse<Batch>> {
    return this.http.put<ApiResponse<Batch>>(`${this.apiUrl}/${id}`, payload, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  delete(id: number): Observable<ApiResponse<any>> {
    return this.http.delete<ApiResponse<any>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(catchError(this.handleError));
  }

  private handleError(error: any) {
    const errorMessage = error?.error?.message || error?.message || 'Error desconocido';
    console.error('Error en BatchesService:', error);
    return throwError(() => ({
      message: errorMessage,
      errors: error?.error?.errors
    }));
  }
}
