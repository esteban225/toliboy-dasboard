import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, map } from 'rxjs/operators';
import { GlobalComponent } from 'src/app/global-component';
import { RawMaterial, PaginationMeta } from '../models/raw-material.model';

@Injectable({
	providedIn: 'root'
})
export class RawMaterialsService {
	private baseUrl = `${GlobalComponent.API_URL}raw-materials`;

	constructor(private http: HttpClient) {}

	private getHeaders(): HttpHeaders {
		// GlobalComponent.headerToken contains the Authorization header and content-type
		const headersObj: any = GlobalComponent.headerToken || {};
		return new HttpHeaders(headersObj);
	}

	/**
	 * Listar materias primas con filtros y paginación.
	 * @param filters Filtros (name, is_active, etc.)
	 * @param page número de página (1-based)
	 * @param perPage registros por página
	 */
	list(filters: Record<string, any> = {}, page = 1, perPage = 100): Observable<{ data: RawMaterial[]; meta: PaginationMeta }> {
		let params = new HttpParams()
			.set('page', String(page))
			.set('per_page', String(perPage));

		Object.keys(filters || {}).forEach((key) => {
			const value = filters[key];
			if (value !== undefined && value !== null && value !== '') {
				params = params.set(key, String(value));
			}
		});

		return this.http
			.get<any>(this.baseUrl, { headers: this.getHeaders(), params })
			.pipe(
				map((res) => ({
					data: res.data ?? res.items ?? res, // adaptarse al formato del backend
					meta:
						res.meta ??
						({
							current_page: res.current_page,
							last_page: res.last_page,
							per_page: res.per_page,
							total: res.total,
						} as PaginationMeta),
				})),
				catchError(this.handleError)
			);
	}

	getById(id: number): Observable<RawMaterial> {
		return this.http.get<RawMaterial>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).pipe(catchError(this.handleError));
	}

	create(payload: Partial<RawMaterial>): Observable<RawMaterial> {
		return this.http.post<RawMaterial>(this.baseUrl, payload, { headers: this.getHeaders() }).pipe(catchError(this.handleError));
	}

	update(id: number, payload: Partial<RawMaterial>): Observable<RawMaterial> {
		return this.http.put<RawMaterial>(`${this.baseUrl}/${id}`, payload, { headers: this.getHeaders() }).pipe(catchError(this.handleError));
	}

	delete(id: number): Observable<void> {
		return this.http.delete<void>(`${this.baseUrl}/${id}`, { headers: this.getHeaders() }).pipe(catchError(this.handleError));
	}

	private handleError(error: any) {
		const err = error.error ?? error.message ?? error;
		// Aquí se podría integrar un logger o notificaciones de UI
		return throwError(() => err);
	}
}

