import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = environment.AUTH_API;

  constructor(private http: HttpClient) { }

  /**
   * Genera un reporte usando el endpoint POST /api/reports/export
   * @param reportData Datos del reporte con title, headings, rows y format
   * @returns Observable<Blob> con el archivo generado
   */
  generateReport(reportData: {
    title: string;
    headings: string[];
    rows: string[][];
    format: 'pdf' | 'csv' | 'xlsx' | 'html';
  }): Observable<Blob> {
    const url = `${this.apiUrl}/reports/export`;
    
    // Obtener token de autenticación
    const token = localStorage.getItem('token') || sessionStorage.getItem('token');
    
    // Headers requeridos según la especificación
    const headers = new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });

    return this.http.post(url, reportData, {
      headers,
      responseType: 'blob'
    });
  }

  /**
   * Descarga un archivo blob generado
   * @param blob Archivo blob
   * @param filename Nombre del archivo
   */
  downloadFile(blob: Blob, filename: string): void {
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }
}
