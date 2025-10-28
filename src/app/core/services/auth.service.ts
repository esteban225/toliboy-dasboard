import { Injectable } from '@angular/core';
import { Store } from '@ngrx/store';

import { User } from '../../store/models/auth.models';
import { getFirebaseBackend } from 'src/app/authUtils';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { catchError, map, tap } from 'rxjs/operators';
import { BehaviorSubject, Observable, of, throwError } from 'rxjs';
import { GlobalComponent } from "../../global-component";
import { AlertService } from './alert.service';

// Action
import { login, loginSuccess, loginFailure, logout, logoutSuccess, RegisterSuccess } from '../../store/actions/authentication.actions';

// Firebase
import { AngularFireAuth } from '@angular/fire/compat/auth';
import firebase from 'firebase/compat/app';

const AUTH_API = GlobalComponent.AUTH_API;

const httpOptions = {
    headers: new HttpHeaders({ 'Content-Type': 'application/json' })
};

@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  private currentUserSubject: BehaviorSubject<User>;
  public currentUser: Observable<User>;

  user!: firebase.User;

  constructor(
    private store: Store,
    private http: HttpClient,
    public afAuth: AngularFireAuth,
    private alertService: AlertService
  ) {
    const storedUser = JSON.parse(localStorage.getItem('currentUser') || 'null');
    console.log('🔧 AUTH SERVICE CONSTRUCTOR - Stored user:', storedUser);
    this.currentUserSubject = new BehaviorSubject<User>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    // Firebase Auth state listener
    this.afAuth.authState.subscribe((user) => {
      console.log('🔥 FIREBASE AUTH STATE CHANGE:', user);
      if (user) {
        this.user = user;
        localStorage.setItem('user', JSON.stringify(this.user));
      } else {
        localStorage.removeItem('user');
      }
    });
  }

  /**
    * current user
    */
  public get currentUserValue(): User {
    const currentValue = this.currentUserSubject.value;
    
    // 🛡️ Fallback: si el BehaviorSubject es null pero hay usuario en localStorage, recuperarlo
    if (!currentValue) {
      const storedUser = localStorage.getItem('currentUser');
      if (storedUser) {
        try {
          const parsedUser = JSON.parse(storedUser);
          if (parsedUser && parsedUser.role) {
            console.log('🔄 AUTH SERVICE - Recovering user from localStorage:', parsedUser);
            this.currentUserSubject.next(parsedUser);
            return parsedUser;
          }
        } catch (error) {
          console.error('❌ AUTH SERVICE - Error parsing stored user:', error);
        }
      }
    }
    
    return currentValue;
  }

  /**
   * Método para limpiar el currentUser desde effects
   */
  public clearCurrentUser(): void {
    console.log('🧹 AUTH SERVICE - clearCurrentUser() called');
    console.trace('🔍 Stack trace for clearCurrentUser:');
    this.currentUserSubject.next(null!);
  }

  /**
   * Registro de usuario con API
   */
  register(email: string, first_name: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'register', {
      email,
      first_name,
      password,
    }, httpOptions).pipe(
      map((response: any) => {
        const user = response;
        this.store.dispatch(RegisterSuccess({ user }));
        
        // 🎉 Mostrar alerta de registro exitoso
        this.alertService.authAlert('register', 
          `¡Bienvenido ${first_name}!`, 
          'Tu cuenta ha sido creada exitosamente'
        );
        
        return user;
      }),
      catchError((error: any) => {
        const errorMessage = error.error?.message || 'Error al crear la cuenta';
        
        // ❌ Mostrar alerta de error en registro
        this.alertService.authAlert('error', errorMessage, 'Verifica los datos e intenta nuevamente');
        
        return throwError(errorMessage);
      })
    );
  }

  /**
   * Login con API - Versión para NgRx
   */
  loginWithApi(email: string, password: string): Observable<any> {
    return this.http.post(AUTH_API + 'login', {
      email,
      password
    }, httpOptions).pipe(
      map((response: any) => {
        if (response && response.token && response.user) {
          // 🔧 Extraer solo los datos del usuario y añadir el token
          const userModel = {
            ...response.user,  // { id, name, email, role, etc. }
            token: response.token
          };
          
          console.log('🔄 AUTH SERVICE - Original response:', response);
          console.log('✅ AUTH SERVICE - Normalized user model:', userModel);
          
          // Almacenar el modelo de usuario normalizado
          localStorage.setItem('currentUser', JSON.stringify(userModel));
          localStorage.setItem('token', response.token);
          
          this.currentUserSubject.next(userModel);
          this.store.dispatch(loginSuccess({ user: userModel }));
          
          // 🎉 Mostrar alerta de éxito
          const username = userModel.name || email;
          this.alertService.loginSuccess(username);
        }
        return response;
      }),
      catchError((error: any) => {
        const errorMessage = error.error?.message || 'Error al iniciar sesión';
        
        // ❌ Mostrar alerta de error
        this.alertService.authAlert('error', errorMessage, 'Verifica tus credenciales e intenta nuevamente');
        
        this.store.dispatch(loginFailure({ error: errorMessage }));
        return throwError(errorMessage);
      })
    );
  }

  /**
   * Login con Firebase
   */
  signIn(email: string, password: string): Promise<any> {
    return this.afAuth.signInWithEmailAndPassword(email, password)
      .then((result: any) => {
        this.store.dispatch(loginSuccess({ user: result.user }));
        return result;
      })
      .catch((error: any) => {
        this.store.dispatch(loginFailure({ error: error.message }));
        throw error;
      });
  }

  /**
   * Método de login principal (mantiene compatibilidad)
   */
  login(email: string, password: string) {
    return this.loginWithApi(email, password);
  }

  /**
   * Logout del usuario - Versión para Effects (retorna Observable)
   */
  logoutFromBackend(): Observable<any> {
    const token = localStorage.getItem('token');
    const headers = token ? 
      new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }) : httpOptions.headers;

    return this.http.post(AUTH_API + 'logout', {}, { headers }).pipe(
      catchError((error: any) => {
        console.error('Error during backend logout:', error);
        // Aunque falle el backend, continuamos con el logout local
        return of({ success: false, error });
      })
    );
  }

  /**
   * Logout del usuario - Método completo (para uso directo)
   */
  logout() {
    // Logout del backend
    this.logoutFromBackend().subscribe({
      next: (response) => {
        console.log('Backend logout response:', response);
      },
      error: (error) => {
        console.error('Backend logout failed:', error);
      }
    });

    // Firebase logout
    this.afAuth.signOut();
    
    // Limpiar datos locales
    localStorage.removeItem('currentUser');
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    
    // Actualizar estado
    this.currentUserSubject.next(null!);
    this.store.dispatch(logout());
    this.store.dispatch(logoutSuccess());
  }

  /**
   * 🚪 Logout con confirmación
   */
  logoutWithConfirmation() {
    return this.alertService.confirmLogout().then((result) => {
      if (result.isConfirmed) {
        // Usuario confirmó, proceder con logout
        this.store.dispatch(logout());
        return true;
      } else {
        // Usuario canceló
        console.log('Logout cancelled by user');
        return false;
      }
    });
  }

  /**
   * 🎯 Forzar logout (sin confirmación) con alerta
   */
  forceLogout(reason?: string) {
    const message = reason || 'Tu sesión ha expirado';
    
    // Mostrar alerta informativa
    this.alertService.warning('Sesión Terminada', message);
    
    // Proceder con logout
    this.store.dispatch(logout());
  }

  /**
   * Obtener usuario actual desde localStorage
   */
  getCurrentUser(): any {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  }

  /**
   * Verificar si el usuario está autenticado
   */
  isAuthenticated(): boolean {
    const user = this.getCurrentUser();
    return !!(user && user.token);
  }

  /**
   * Login con Facebook
   */
  signInWithFacebook(): Promise<any> {
    const provider = new firebase.auth.FacebookAuthProvider();
    return this.afAuth.signInWithPopup(provider)
      .then((result: any) => {
        this.store.dispatch(loginSuccess({ user: result.user }));
        return result;
      })
      .catch((error: any) => {
        this.store.dispatch(loginFailure({ error: error.message }));
        throw error;
      });
  }

  /**
   * Login con Google
   */
  signInWithGoogle(): Promise<any> {
    const provider = new firebase.auth.GoogleAuthProvider();
    return this.afAuth.signInWithPopup(provider)
      .then((result: any) => {
        this.store.dispatch(loginSuccess({ user: result.user }));
        return result;
      })
      .catch((error: any) => {
        this.store.dispatch(loginFailure({ error: error.message }));
        throw error;
      });
  }

  /**
   * Registro con Firebase
   */
  signUp(email: string, password: string): Promise<any> {
    return this.afAuth.createUserWithEmailAndPassword(email, password)
      .then((result: any) => {
        this.store.dispatch(RegisterSuccess({ user: result.user }));
        return result;
      })
      .catch((error: any) => {
        throw error;
      });
  }

  /**
   * Resetear contraseña
   */
  resetPassword(email: string): Promise<any> {
    return this.afAuth.sendPasswordResetEmail(email);
  }
}
