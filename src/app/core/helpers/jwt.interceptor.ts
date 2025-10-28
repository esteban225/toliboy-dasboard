import { Injectable } from '@angular/core';
import {
  HttpInterceptor,
  HttpRequest,
  HttpHandler,
  HttpEvent
} from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    try {
      const raw = localStorage.getItem('currentUser');
      const currentUser = raw ? JSON.parse(raw) : null;

      const token = localStorage.getItem('token');
      if (token) {
        request = request.clone({
          setHeaders: {
            Authorization: `Bearer ${token}`
          }
        });
      }
    } catch (e) {
      // si JSON.parse falla por cualquier motivo, no rompemos la petición; seguimos sin header
      console.warn('JwtInterceptor: no se pudo obtener token de localStorage', e);
    }
    // console.log('Request final en interceptor:', request);
    return next.handle(request);
  }
}