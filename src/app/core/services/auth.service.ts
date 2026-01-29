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
    this.currentUserSubject = new BehaviorSubject<User>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();

    // Firebase Auth state listener
    this.afAuth.authState.subscribe((user) => {
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
            this.currentUserSubject.next(parsedUser);
            return parsedUser;
          }
        } catch (error) {
          // Silent error - avoid logging in production
        }
      }
    }
    
    return currentValue;
  }

  /**
   * Método para limpiar el currentUser desde effects
   */
  public clearCurrentUser(): void {
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
          
          // 🕐 IMPORTANTE: Guardar expires_in del backend
          // Esto es más seguro que decodificar JWT
          if (response.expires_in) {
            // expires_in puede venir en segundos o string con unidad (ej: "15m", "900s")
            const expiresInSeconds = this.parseExpiresIn(response.expires_in);
            const tokenExpirationTime = new Date().getTime() + (expiresInSeconds * 1000);
            localStorage.setItem('tokenExpirationTime', tokenExpirationTime.toString());
            console.log(`🕐 Token expirará en ${expiresInSeconds} segundos`);
          }
          
          // 🔄 Si hay refresh token, también guardar su expiración si viene
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
            if (response.refresh_expires_in) {
              const refreshExpiresInSeconds = this.parseExpiresIn(response.refresh_expires_in);
              const refreshExpirationTime = new Date().getTime() + (refreshExpiresInSeconds * 1000);
              localStorage.setItem('refreshTokenExpirationTime', refreshExpirationTime.toString());
            }
          }
          
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
   * Obtener token de forma centralizada.
   * Preferimos `currentUserValue.token` y como fallback leer localStorage (único punto).
   */
  public getToken(): string | null {
    try {
      const current = this.currentUserSubject?.value;
      if (current && current.token) return current.token;
      const stored = localStorage.getItem('token');
      return stored ?? null;
    } catch (e) {
      return localStorage.getItem('token');
    }
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

  /**
   * 🔄 REFRESCAR TOKEN - Obtener un nuevo token usando el refresh token
   * Este método es llamado cuando el token actual ha expirado
   */
  refreshToken(): Observable<any> {
    const refreshToken = localStorage.getItem('refreshToken');
    
    if (!refreshToken) {
      console.error('❌ No refresh token available');
      this.forceLogout('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
      return throwError('No refresh token available');
    }

    return this.http.post(AUTH_API + 'refresh-token', {
      refreshToken: refreshToken
    }, httpOptions).pipe(
      map((response: any) => {
        if (response && response.token) {
          // Actualizar el nuevo token en localStorage
          localStorage.setItem('token', response.token);
          
          // 🕐 IMPORTANTE: Guardar la nueva expiración del backend
          if (response.expires_in) {
            const expiresInSeconds = this.parseExpiresIn(response.expires_in);
            const tokenExpirationTime = new Date().getTime() + (expiresInSeconds * 1000);
            localStorage.setItem('tokenExpirationTime', tokenExpirationTime.toString());
            console.log(`🕐 Nuevo token expirará en ${expiresInSeconds} segundos`);
          }
          
          // Si el response también trae un nuevo refresh token, actualizarlo
          if (response.refreshToken) {
            localStorage.setItem('refreshToken', response.refreshToken);
            if (response.refresh_expires_in) {
              const refreshExpiresInSeconds = this.parseExpiresIn(response.refresh_expires_in);
              const refreshExpirationTime = new Date().getTime() + (refreshExpiresInSeconds * 1000);
              localStorage.setItem('refreshTokenExpirationTime', refreshExpirationTime.toString());
            }
          }
          
          // Si trae datos del usuario actualizados, actualizar también
          if (response.user) {
            const userModel = {
              ...response.user,
              token: response.token
            };
            localStorage.setItem('currentUser', JSON.stringify(userModel));
            this.currentUserSubject.next(userModel);
          }
          
          console.log('✅ Token refrescado exitosamente');
          return response;
        }
        return response;
      }),
      catchError((error: any) => {
        console.error('❌ Error refreshing token:', error);
        
        // Si recibimos 401, significa que el refresh token también expiró
        if (error.status === 401) {
          console.error('⚠️ Refresh token también expirado - Token está en blacklist');
          this.forceLogout('Tu sesión ha expirado. Por favor inicia sesión nuevamente.');
        }
        
        // Si falla el refresh, hacer logout forzado
        this.forceLogout('Error al refrescar la sesión. Por favor inicia sesión nuevamente.');
        return throwError(error);
      })
    );
  }

  /**
   * 🔄 VALIDAR EXPIRACIÓN DE TOKEN (MEJORADO)
   * Ahora usa la expiración guardada del backend en lugar de decodificar JWT
   * Verifica si el token está próximo a expirar (ej: faltan 5 minutos)
   */
  isTokenExpiringSoon(minutesThreshold: number = 5): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    const tokenExpirationTime = localStorage.getItem('tokenExpirationTime');
    
    // Si no tenemos la expiración guardada, usar decodificación como fallback
    if (!tokenExpirationTime) {
      console.warn('⚠️ No tokenExpirationTime found, using JWT decode as fallback');
      return this.isTokenExpiringSoonLegacy(minutesThreshold);
    }

    try {
      const expirationTimeMs = parseInt(tokenExpirationTime, 10);
      const currentTime = new Date().getTime();
      const timeUntilExpiration = expirationTimeMs - currentTime;
      
      // Si le quedan menos de X minutos, retornar true
      const thresholdMs = minutesThreshold * 60 * 1000;
      return timeUntilExpiration < thresholdMs;
    } catch (error) {
      console.error('Error checking token expiration:', error);
      return true;
    }
  }

  /**
   * ⏱️ OBTENER TIEMPO RESTANTE DEL TOKEN (MEJORADO)
   * Retorna cuántos segundos faltan para que expire el token
   * Ahora usa la expiración guardada del backend
   */
  getTokenExpirationTime(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    const tokenExpirationTime = localStorage.getItem('tokenExpirationTime');
    
    // Si no tenemos la expiración guardada, usar decodificación como fallback
    if (!tokenExpirationTime) {
      console.warn('⚠️ No tokenExpirationTime found, using JWT decode as fallback');
      return this.getTokenExpirationTimeLegacy();
    }

    try {
      const expirationTimeMs = parseInt(tokenExpirationTime, 10);
      const currentTime = new Date().getTime();
      const secondsRemaining = Math.floor((expirationTimeMs - currentTime) / 1000);
      
      return Math.max(0, secondsRemaining);
    } catch (error) {
      console.error('Error getting token expiration time:', error);
      return 0;
    }
  }

  /**
   * 🔍 VALIDAR SI TOKEN ESTÁ EN BLACKLIST
   * Verifica si el token ha sido revocado por el backend
   * El backend retorna 401 cuando el token está en blacklist
   */
  isTokenBlacklisted(): boolean {
    // Si el tiempo de expiración está vencido más de lo normal, probablemente esté en blacklist
    const tokenExpirationTime = localStorage.getItem('tokenExpirationTime');
    if (!tokenExpirationTime) return false;

    try {
      const expirationTimeMs = parseInt(tokenExpirationTime, 10);
      const currentTime = new Date().getTime();
      
      // Si pasó más de 1 hora de la expiración, probablemente esté en blacklist
      const timeSinceExpiration = currentTime - expirationTimeMs;
      const oneHourInMs = 60 * 60 * 1000;
      
      // También verificar si viene error 401 del backend
      return timeSinceExpiration > oneHourInMs;
    } catch (error) {
      return false;
    }
  }

  /**
   * 🔧 PARSEAR EXPIRES_IN DEL BACKEND
   * Convierte diferentes formatos de expires_in a segundos
   * Soporta: "900", "900s", "15m", "1h", etc.
   */
  private parseExpiresIn(expiresIn: string | number): number {
    if (typeof expiresIn === 'number') {
      // Si es número, asumir que es en segundos
      return expiresIn;
    }

    if (typeof expiresIn === 'string') {
      // Remover espacios
      expiresIn = expiresIn.trim();

      // Si es solo números, asumir segundos
      if (/^\d+$/.test(expiresIn)) {
        return parseInt(expiresIn, 10);
      }

      // Parseear formato con unidad (ej: "15m", "900s", "1h")
      const match = expiresIn.match(/^(\d+)([smh])$/i);
      if (match) {
        const value = parseInt(match[1], 10);
        const unit = match[2].toLowerCase();

        switch (unit) {
          case 's':
            return value; // segundos
          case 'm':
            return value * 60; // minutos
          case 'h':
            return value * 60 * 60; // horas
          default:
            return value;
        }
      }
    }

    // Valor por defecto si no se puede parsear
    console.warn(`⚠️ Could not parse expires_in: ${expiresIn}, defaulting to 900s`);
    return 900; // 15 minutos por defecto
  }

  /**
   * 🔓 DECODIFICAR JWT TOKEN (LEGACY - Para fallback)
   * Extrae el payload del token JWT sin verificación (solo lectura)
   * Solo se usa si no tenemos la expiración guardada del backend
   */
  private decodeToken(token: string): any {
    try {
      // El token JWT tiene 3 partes separadas por puntos: header.payload.signature
      const parts = token.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid token format');
      }

      // El payload es la segunda parte, está en base64url
      const payload = parts[1];
      
      // Decodificar base64url a string
      const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
      
      // Parsear el JSON
      return JSON.parse(decoded);
    } catch (error) {
      console.error('Error decoding token:', error);
      return null;
    }
  }

  /**
   * 🔄 VALIDAR EXPIRACIÓN CON JWT (LEGACY - Para fallback)
   * Versión antigua que decodifica JWT si no tenemos expires_in del backend
   */
  private isTokenExpiringSoonLegacy(minutesThreshold: number = 5): boolean {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return true;

      const expirationTime = payload.exp * 1000;
      const currentTime = new Date().getTime();
      const timeUntilExpiration = expirationTime - currentTime;
      
      const thresholdMs = minutesThreshold * 60 * 1000;
      return timeUntilExpiration < thresholdMs;
    } catch (error) {
      console.error('Error decoding token:', error);
      return true;
    }
  }

  /**
   * ⏱️ OBTENER TIEMPO RESTANTE CON JWT (LEGACY - Para fallback)
   * Versión antigua que decodifica JWT si no tenemos expires_in del backend
   */
  private getTokenExpirationTimeLegacy(): number {
    const token = localStorage.getItem('token');
    if (!token) return 0;

    try {
      const payload = this.decodeToken(token);
      if (!payload || !payload.exp) return 0;

      const expirationTime = payload.exp * 1000;
      const currentTime = new Date().getTime();
      const secondsRemaining = Math.floor((expirationTime - currentTime) / 1000);
      
      return Math.max(0, secondsRemaining);
    } catch (error) {
      console.error('Error getting token expiration time:', error);
      return 0;
    }
  }
}
