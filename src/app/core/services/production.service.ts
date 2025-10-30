import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalComponent } from 'src/app/global-component';
import { ProductionForm } from 'src/app/store/models/production.model';

@Injectable({
  providedIn: 'root'
})
export class ProductionService {
  private baseUrl = GlobalComponent.PRODUCTION_API; // 👉 https://apitoliboy.lat/api/forms

  constructor(private http: HttpClient) {}

  // ✅ Obtiene todos los formularios disponibles
  getProductionForms(): Observable<ProductionForm[]> {
    const token = GlobalComponent.headerToken || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<ProductionForm[]>(this.baseUrl);
  }

  // ✅ Obtiene un formulario específico por ID
  getFormById(id: number): Observable<ProductionForm> {
    const token = GlobalComponent.headerToken || '';
    const headers = new HttpHeaders({
      Authorization: `Bearer ${token}`
    });

    return this.http.get<ProductionForm>(`${this.baseUrl}/${id}`, { headers });
  }
}
