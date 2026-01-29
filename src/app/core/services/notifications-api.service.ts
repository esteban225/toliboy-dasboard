import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GlobalComponent } from '../../global-component';

@Injectable({ providedIn: 'root' })
export class NotificationsApiService {
  private readonly url = GlobalComponent.API_URL + 'notifications';

  constructor(private http: HttpClient) {}

  createNotification(payload: any): Observable<any> {
    const token = localStorage.getItem('token');
    const headersObj: any = {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    };
    if (token) {
      headersObj['Authorization'] = `Bearer ${token}`;
    }

    const headers = new HttpHeaders(headersObj);
    return this.http.post(this.url, payload, { headers });
  }
}
