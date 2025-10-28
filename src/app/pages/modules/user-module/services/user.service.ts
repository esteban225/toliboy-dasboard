import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import { UserData, UserRole, DataUser, Worklog } from '../models/userData.model';
import { environment } from 'src/environments/environment';

@Injectable({
    providedIn: 'root'
})
export class UserService {
    private apiUrl = `${environment.AUTH_API}/accesData/users`;

    constructor(private http: HttpClient) { }

    private handleError(error: HttpErrorResponse) {
        let errorMessage = 'Ha ocurrido un error en el servidor';
        if (error.error instanceof ErrorEvent) {
            errorMessage = error.error.message;
        } else {
            errorMessage = error.error?.message || error.message;
        }
        return throwError(() => ({ status: error.status, message: errorMessage }));
    }

    // Usuarios CRUD
    getUsers(): Observable<UserData[]> {
       // const headers = GlobalComponent.headerToken || '';
        return this.http.get<{ status: boolean; message: string; data: UserData[] }>(`${this.apiUrl}?per_page=100`).pipe(
            // Extrae solo el arreglo de usuarios
            map(response => response.data),
            catchError(this.handleError)
        );
    }


    getUserById(id: number): Observable<UserData> {
        return this.http.get<UserData>(`${this.apiUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    createUser(user: Partial<UserData>): Observable<UserData> {
        return this.http.post<any>(this.apiUrl, user).pipe(
            // si el backend devuelve { status, message, data: user }
            map((resp) => resp?.data ?? resp),
            catchError(this.handleError)
        );
    }

    updateUser(id: number, user: Partial<UserData>): Observable<UserData> {
        const url = `${this.apiUrl}/${id}`;
        return this.http.put<any>(url, user).pipe(
            // El backend puede devolver:
            // - un boolean (true/false)
            // - { status: boolean }
            // - { data: UserData } o { user: UserData }
            // - o directamente el UserData
            map((resp) => {
                if (typeof resp === 'boolean') {
                    // Si sólo llegó true/false, retornamos el user local con el id para mantener la compatibilidad
                    return { ...(user as UserData), id } as UserData;
                }
                if (resp && typeof resp === 'object') {
                    if ('data' in resp && resp.data) {
                        return resp.data as UserData;
                    }
                    if ('user' in resp && resp.user) {
                        return resp.user as UserData;
                    }
                    if ('status' in resp && resp.status === true) {
                        return { ...(user as UserData), id } as UserData;
                    }
                    // Si la respuesta parece ser ya la entidad
                    return resp as UserData;
                }
                // Fallback: devolver el user local con id
                return { ...(user as UserData), id } as UserData;
            }),
            catchError(this.handleError)
        );
    }

    deleteUser(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }
}
