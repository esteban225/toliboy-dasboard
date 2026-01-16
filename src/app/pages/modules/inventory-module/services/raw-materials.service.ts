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
		// Relee el token en cada llamada para no depender de un valor estático
		const token = localStorage.getItem('token');
		const headersObj: any = {
			'Content-Type': 'application/json'
		};
		if (token) {
			headersObj['Authorization'] = `Bearer ${token}`;
		}
		return new HttpHeaders(headersObj);
	}

	/**
	 * Listar materias primas con filtros y paginación.
	 * @param filters Filtros (name, is_active, etc.)
	 * @param page número de página (1-based)
	 * @param perPage registros por página
	 */
	list(filters: Record<string, any> = {}, page = 1, perPage = 100): Observable<{ data: RawMaterial[]; meta: PaginationMeta | null }> {
		let params = new HttpParams()
			.set('page', String(page))
			.set('per_page', String(perPage));

		Object.keys(filters || {}).forEach((key) => {
			const value = filters[key];
			if (value !== undefined && value !== null && value !== '') {
				params = params.set(key, String(value));
			}
		});

		console.log('[RAW-MATERIALS SERVICE] Llamando a:', this.baseUrl);

		return this.http
			.get<any>(this.baseUrl, { headers: this.getHeaders(), params })
			.pipe(
				map((res) => {
					console.log('[RAW-MATERIALS SERVICE] Respuesta cruda:', res);
					
					// Soporta respuestas: {data:[...]}, {data:{data:[...],meta}}, {items:[...]}, o array directo
					let extractedData: any[] = [];
					
					if (Array.isArray(res)) {
						extractedData = res;
					} else if (res?.success && Array.isArray(res?.data)) {
						// Formato Laravel: {success: true, data: [...]}
						extractedData = res.data;
					} else if (Array.isArray(res?.data)) {
						extractedData = res.data;
					} else if (Array.isArray(res?.data?.data)) {
						extractedData = res.data.data;
					} else if (Array.isArray(res?.items)) {
						extractedData = res.items;
					}

					console.log('[RAW-MATERIALS SERVICE] Datos extraídos:', extractedData.length, 'items');
					if (extractedData.length > 0) {
						console.log('[RAW-MATERIALS SERVICE] Ejemplo item:', extractedData[0]);
					}

					const extractedMeta: any = res?.meta ?? res?.data?.meta ?? null;

					return {
						data: extractedData,
						meta: extractedMeta,
					};
				}),
				catchError((error) => {
					console.error('[RAW-MATERIALS SERVICE] Error:', error);
					return throwError(() => error);
				})
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

