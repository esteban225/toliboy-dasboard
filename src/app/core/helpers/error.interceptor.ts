import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, filter, take, switchMap } from 'rxjs/operators';
import { AuthenticationService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
    // Variable para evitar múltiples llamadas simultáneas al refresh token
    private isRefreshing = false;
    private refreshTokenSubject: BehaviorSubject<any> = new BehaviorSubject<any>(null);

    constructor(
        private authenticationService: AuthenticationService,
        private router: Router
    ) { }

    intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
        return next.handle(request).pipe(
            catchError((error: HttpErrorResponse) => {
                // Si recibimos error 401 (Unauthorized) por token expirado
                if (error.status === 401) {
                    // Si ya estamos en proceso de refresh, esperar a que termine
                    if (this.isRefreshing) {
                        return this.refreshTokenSubject.pipe(
                            filter(result => result != null),
                            take(1),
                            switchMap(() => {
                                // Reintentar la request original con el nuevo token
                                return next.handle(request);
                            }),
                            catchError(() => {
                                // Si el refresh falla, hacer logout
                                this.authenticationService.forceLogout('Tu sesión ha expirado');
                                return throwError(() => new Error('Token refresh failed'));
                            })
                        );
                    }

                    // Evitar refresh si viene de endpoints de login/auth
                    if (request.url.includes('/auth/login') || request.url.includes('/auth/register')) {
                        this.authenticationService.logout();
                        this.router.navigate(['/auth/login']);
                        return throwError(() => error);
                    }

                    // 🔍 Detectar si el token está en blacklist
                    const errorMessage = error.error?.message || '';
                    if (this.isTokenBlacklistedError(errorMessage)) {
                        console.error('❌ Token está en lista negra (blacklist)');
                        this.authenticationService.forceLogout('Tu sesión ha sido revocada. Por favor inicia sesión nuevamente.');
                        return throwError(() => error);
                    }

                    // Marcar que estamos refrescando el token
                    this.isRefreshing = true;
                    this.refreshTokenSubject.next(null);

                    // Intentar refrescar el token
                    return this.authenticationService.refreshToken().pipe(
                        switchMap((response: any) => {
                            this.isRefreshing = false;
                            // Notificar a las otras requests que el token fue refrescado
                            this.refreshTokenSubject.next(response.token);
                            // Reintentar la request original
                            return next.handle(request);
                        }),
                        catchError((error: any) => {
                            this.isRefreshing = false;
                            
                            // 🔍 Detectar si el refresh token también está en blacklist
                            const errorMessage = error.error?.message || '';
                            if (this.isTokenBlacklistedError(errorMessage)) {
                                console.error('❌ Refresh token también está en blacklist');
                                this.authenticationService.forceLogout('Tu sesión ha sido revocada. Por favor inicia sesión nuevamente.');
                            } else {
                                // Si el refresh falla por otra razón, hacer logout
                                this.authenticationService.forceLogout('Tu sesión ha expirado');
                            }
                            
                            return throwError(() => error);
                        })
                    );
                } 
                // Otros errores HTTP
                else if (error.status === 403) {
                    console.warn('⚠️ Acceso denegado (403)');
                } else if (error.status === 404) {
                    console.warn('⚠️ Recurso no encontrado (404)');
                } else if (error.status === 500) {
                    console.error('❌ Error del servidor (500)');
                }

                return throwError(() => error);
            })
        );
    }

    /**
     * 🔍 Detectar si el mensaje de error indica que el token está en blacklist
     */
    private isTokenBlacklistedError(errorMessage: string): boolean {
        if (!errorMessage) return false;
        
        const blacklistKeywords = [
            'blacklist',
            'revoked',
            'invalid token',
            'token has been revoked',
            'token inválido',
            'lista negra',
            'token revocado'
        ];
        
        const lowerMessage = errorMessage.toLowerCase();
        return blacklistKeywords.some(keyword => lowerMessage.includes(keyword));
    }
}
