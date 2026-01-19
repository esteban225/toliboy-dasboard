import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalComponent } from 'src/app/global-component';

@Injectable({
	providedIn: 'root'
})
export class InventoryMovementService {
	// URL basada en el controlador PHP Laravel
	private baseUrl = `${GlobalComponent.API_URL}inventory-movements`;

	constructor(private http: HttpClient) { }

	// Lista de movimientos con filtros (Solo fecha)
	list(filters: Record<string, any> = {}, perPage = 100, page = 1, created_at = new Date()): Observable<any> {
		// Formatea la fecha a 'YYYY-MM-DD'
		const fechaSolo = created_at.toISOString().split('T')[0];

		let params = new HttpParams()
			.set('per_page', String(perPage))
			.set('page', String(page))
			.set('created_at', fechaSolo); // Ahora envía solo la fecha

		Object.keys(filters || {}).forEach(key => {
			const val = filters[key];
			if (val !== undefined && val !== null && val !== '') {
				params = params.set(key, String(val));
			}
		});

		return this.http.get<any>(this.baseUrl, { params });
	}

	// Lista sin forzar fecha (para búsquedas históricas, ej: por lote en notas)
	listWithoutDate(filters: Record<string, any> = {}, perPage = 100, page = 1): Observable<any> {
		let params = new HttpParams()
			.set('per_page', String(perPage))
			.set('page', String(page));

		Object.keys(filters || {}).forEach(key => {
			const val = filters[key];
			if (val !== undefined && val !== null && val !== '') {
				params = params.set(key, String(val));
			}
		});

		return this.http.get<any>(this.baseUrl, { params });
	}

	// Obtener un movimiento con sus lotes asociados
	get(id: number): Observable<any> {
		return this.http.get<any>(`${this.baseUrl}/${id}`);
	}

	// Crear movimiento (entrada o salida)
	create(payload: any): Observable<any> {
		return this.http.post<any>(this.baseUrl, payload);
	}

	// Actualizar movimiento
	update(id: number, payload: any): Observable<any> {
		return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
	}

	// Eliminar movimiento
	delete(id: number): Observable<any> {
		return this.http.delete<any>(`${this.baseUrl}/${id}`);
	}

	// Crear entrada de materia prima (con lote)
	createEntry(payload: {
		raw_material_id: number;
		quantity: number;
		batch_code: string;
		expiry_date: string;
		supplier?: string;
		notes?: string;
	}): Observable<any> {
		return this.http.post<any>(`${this.baseUrl}/entry`, {
			...payload,
			movement_type: 'in'
		});
	}

	// Crear salida de materia prima hacia línea de producción
	createExit(payload: {
		raw_material_id: number;
		quantity: number;
		production_line: 'richard' | 'panaderia' | 'pasteleria';
		line_batch?: string;
		destination_batch?: string;
		notes?: string;
	}): Observable<any> {
		return this.http.post<any>(`${this.baseUrl}/exit`, {
			...payload,
			movement_type: 'out'
		});
	}

	// Obtener reporte completo de movimientos con análisis de egreso
	getReport(filters: {
		start_date?: string;
		end_date?: string;
		movement_type?: 'in' | 'out';
		production_line?: string;
	} = {}): Observable<any> {
		let params = new HttpParams();
		Object.keys(filters).forEach(key => {
			const val = (filters as any)[key];
			if (val) {
				params = params.set(key, String(val));
			}
		});
		return this.http.get<any>(`${this.baseUrl}/report`, { params });
	}

	// Obtener lotes por materia prima
	getBatchesByMaterial(materialId: number): Observable<any> {
		return this.http.get<any>(`${this.baseUrl}/material/${materialId}/batches`);
	}

	// Obtener lotes próximos a vencer
	getExpiringBatches(daysThreshold: number = 30): Observable<any> {
		return this.http.get<any>(`${this.baseUrl}/batches/expiring`, {
			params: new HttpParams().set('days', String(daysThreshold))
		});
	}

	// Calcular egreso total por línea de producción
	getLineExpense(line: string, startDate?: string, endDate?: string): Observable<any> {
		let params = new HttpParams().set('production_line', line);
		if (startDate) params = params.set('start_date', startDate);
		if (endDate) params = params.set('end_date', endDate);

		return this.http.get<any>(`${this.baseUrl}/line-expense`, { params });
	}

	// Obtener historial de lotes utilizados en una línea
	getLineHistory(line: string, limit: number = 50): Observable<any> {
		return this.http.get<any>(`${this.baseUrl}/line/${line}/history`, {
			params: new HttpParams().set('limit', String(limit))
		});
	}
}


