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

	constructor(private http: HttpClient) {}

	list(filters: Record<string, any> = {}, perPage = 100, page = 1): Observable<any> {
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

	get(id: number): Observable<any> {
		return this.http.get<any>(`${this.baseUrl}/${id}`);
	}

	create(payload: any): Observable<any> {
		return this.http.post<any>(this.baseUrl, payload);
	}

	update(id: number, payload: any): Observable<any> {
		return this.http.put<any>(`${this.baseUrl}/${id}`, payload);
	}

	delete(id: number): Observable<any> {
		return this.http.delete<any>(`${this.baseUrl}/${id}`);
	}
}


