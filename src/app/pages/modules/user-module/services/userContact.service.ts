import {Injectable} from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError, tap, map } from 'rxjs/operators';
import {DataUser } from '../models/userData.model';
import { environment } from 'src/environments/environment';
import { GlobalComponent } from 'src/app/global-component';

@Injectable({
    providedIn: 'root'
})
export class UserContactService {
    private apiUrlAdmin = `${environment.AUTH_API}/accesData/dataUsers`;
    private apiUrl = `${environment.AUTH_API}/dataUsers`;

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

    // User Contacts CRUD
    getUserContacts(): Observable<DataUser[]> {
        return this.http.get<{ status: boolean; message: string; data: DataUser[] }>(this.apiUrlAdmin).pipe(
            map(response => response.data),
            catchError(this.handleError)
        );
    }

    getUserContactById(id: number): Observable<DataUser> {
        return this.http.get<DataUser>(`${this.apiUrl}/${id}`)
            .pipe(catchError(this.handleError));
    }

    createUserContact(userContact: Partial<DataUser>): Observable<DataUser> {
        return this.http.post<any>(this.apiUrl, userContact).pipe(
            map((resp) => resp?.data ?? resp),
            catchError(this.handleError)
        );
    }

    updateUserContact(id: number, userContact: Partial<DataUser>): Observable<DataUser> {
        const url = `${this.apiUrl}/${id}`;
        return this.http.put<any>(url, userContact).pipe(
            map((resp) => {
                if (typeof resp === 'boolean') {
                    return { ...(userContact as DataUser), id } as DataUser;
                }
                if (resp && typeof resp === 'object') {
                    if ('data' in resp && resp.data) {
                        return resp.data as DataUser;
                    }
                    if ('user' in resp && resp.user) {
                        return resp.user as DataUser;
                    }
                    if ('status' in resp && resp.status === true) {
                        return { ...(userContact as DataUser), id } as DataUser;
                    }
                    return resp as DataUser;
                }
                return { ...(userContact as DataUser), id } as DataUser;
            }),
            catchError(this.handleError)
        );
    }

    deleteUserContact(id: number): Observable<void> {
        return this.http.delete<void>(`${this.apiUrlAdmin}/${id}`)
            .pipe(catchError(this.handleError));
    }
}
