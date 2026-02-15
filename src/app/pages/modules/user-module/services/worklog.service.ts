import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from 'src/environments/environment';
import { ApiResponse, PaginationMeta, Worklog, WorklogFilters } from '../models/worklog.model';

interface PaginatedResponse {
  data: Worklog[];
  meta?: PaginationMeta;
}

@Injectable({ providedIn: 'root' })
export class WorklogService {
  private readonly baseUrl = `${environment.AUTH_API}`;

  constructor(private http: HttpClient) {}

  private buildHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { Accept: 'application/json' };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headers);
  }

  private fromApi<T>(value: ApiResponse<T> | T): T {
    if (value && typeof value === 'object' && 'status' in (value as ApiResponse<T>) && 'data' in (value as ApiResponse<T>)) {
      return (value as ApiResponse<T>).data;
    }
    return value as T;
  }

  getWorklogsByUser(userId: number): Observable<Worklog[]> {
    const url = `${this.baseUrl}/hoursLog/users/${userId}`;
    return this.http
      .get<ApiResponse<Worklog[]>>(url, { headers: this.buildHeaders() })
      .pipe(
        map(resp => {
          const data = this.fromApi<Worklog[] | Worklog>(resp);
          if (Array.isArray(data)) {
            return data;
          }
          return data ? [data] : [];
        })
      );
  }

  getWorklogs(filters?: WorklogFilters): Observable<PaginatedResponse> {
    const url = `${this.baseUrl}/work-logs`;
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          params = params.set(key, value as any);
        }
      });
    }
    return this.http
      .get<ApiResponse<Worklog[]>>(url, { headers: this.buildHeaders(), params })
      .pipe(
        map(response => {
          const data = this.fromApi<Worklog[] | Worklog>(response);
          const normalized = Array.isArray(data) ? data : data ? [data] : [];
          return {
            data: normalized,
            meta: response?.meta
          };
        })
      );
  }

  getWorklogById(id: number): Observable<Worklog> {
    const url = `${this.baseUrl}/work-logs/${id}`;
    return this.http.get<ApiResponse<Worklog>>(url, { headers: this.buildHeaders() }).pipe(map(resp => this.fromApi<Worklog>(resp)));
  }

  createWorklog(payload: Partial<Worklog>): Observable<Worklog> {
    const url = `${this.baseUrl}/work-logs`;
    return this.http.post<ApiResponse<Worklog>>(url, payload, { headers: this.buildHeaders() }).pipe(map(resp => this.fromApi<Worklog>(resp)));
  }

  updateWorklog(id: number, payload: Partial<Worklog>): Observable<Worklog> {
    const url = `${this.baseUrl}/work-logs/${id}`;
    return this.http.put<ApiResponse<Worklog>>(url, payload, { headers: this.buildHeaders() }).pipe(map(resp => this.fromApi<Worklog>(resp)));
  }

  deleteWorklog(id: number): Observable<void> {
    const url = `${this.baseUrl}/work-logs/${id}`;
    return this.http.delete<void>(url, { headers: this.buildHeaders() });
  }

  registerWorklog(id: number, payload?: { batch_id?: number; task_description?: string; notes?: string }): Observable<Worklog> {
    const url = `${this.baseUrl}/work-logs/register/${id}`;
    return this.http
      .post<ApiResponse<Worklog>>(url, payload ?? {}, { headers: this.buildHeaders() })
      .pipe(map(resp => this.fromApi<Worklog>(resp)));
  }
}
