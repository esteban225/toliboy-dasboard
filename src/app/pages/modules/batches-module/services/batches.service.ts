import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GlobalComponent } from 'src/app/global-component';
import { Batch, PaginationMeta } from '../models/batch.model';

interface ApiResponse<T> {
  data: T | undefined;
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

  private normalizePayload(payload: Partial<Batch>): Partial<Batch> {
    const normalized = { ...payload };
    // Mapear booleanos a valores ENUM
    if (normalized.status !== undefined && normalized.status !== null) {
      if (typeof normalized.status === 'boolean') {
        // true -> 'in_process', false -> 'paused'
        normalized.status = normalized.status ? 'in_process' : 'paused';
      } else if (typeof normalized.status === 'string') {
        const statusStr = normalized.status as string;
        if (statusStr === 'true') {
          normalized.status = 'in_process';
        } else if (statusStr === 'false') {
          normalized.status = 'paused';
        }
        // Si ya es un valor ENUM válido, dejarlo como está
      }
    }
    return normalized;
  }

  private normalizeBatch(batch: Batch | undefined | null): Batch | undefined {
    // Retornar undefined si batch no existe
    if (!batch) {
      return undefined;
    }

    // No convertir status, mantener el valor original del servidor
    // Los valores pueden ser: 'planned', 'in_process', 'paused', 'completed', 'delivered', 'cancelled'
    return batch;
  }

  private normalizeBatches(batches: Batch[]): Batch[] {
    return batches.map(b => this.normalizeBatch({ ...b })).filter((b): b is Batch => b !== undefined);
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
    }).pipe(
      catchError(this.handleError),
      map(res => ({
        ...res,
        data: this.normalizeBatches(res.data || [])
      }))
    );
  }

  getById(id: number): Observable<ApiResponse<Batch>> {
    return this.http.get<ApiResponse<Batch>>(`${this.apiUrl}/${id}`, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError),
      map(res => ({
        ...res,
        data: res.data ? this.normalizeBatch(res.data) : undefined
      }))
    );
  }

  create(payload: Partial<Batch>): Observable<ApiResponse<Batch>> {
    const normalizedPayload = this.normalizePayload(payload);
    return this.http.post<ApiResponse<Batch>>(this.apiUrl, normalizedPayload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError),
      map(res => ({
        ...res,
        data: res.data ? this.normalizeBatch(res.data) : undefined
      }))
    );
  }

  update(id: number, payload: Partial<Batch>): Observable<ApiResponse<Batch>> {
    const normalizedPayload = this.normalizePayload(payload);
    return this.http.put<ApiResponse<Batch>>(`${this.apiUrl}/${id}`, normalizedPayload, {
      headers: this.getHeaders()
    }).pipe(
      catchError(this.handleError),
      map(res => ({
        ...res,
        data: res.data ? this.normalizeBatch(res.data) : undefined
      }))
    );
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
