import { Injectable, Inject } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';
import { map, switchMap, catchError, exhaustMap, tap, distinctUntilChanged, debounceTime } from 'rxjs/operators';
import { from, of } from 'rxjs';
import { AuthenticationService } from '../../core/services/auth.service';
import { MenuService } from '../../core/services/menu.service';
import { login, loginSuccess, loginFailure, logout, logoutSuccess, logoutFailure, Register, signInWithFacebook, signInWithGoogle } from '../actions/authentication.actions';
import { Router } from '@angular/router';
import { AlertService } from '../../core/services/alert.service';

@Injectable()
export class AuthenticationEffects {

  Register$ = createEffect(() =>
    this.actions$.pipe(
      ofType(Register),
      exhaustMap(({ email, first_name, password }) =>
        this.AuthenticationService.register(email, first_name, password).pipe(
          map((resp: any) => {
            // normalizar respuesta
            const storedUser = resp?.user ?? resp?.data ?? resp ?? null;
            const token = resp?.token ?? resp?.data?.token ?? resp?.user?.token ?? storedUser?.token ?? localStorage.getItem('token');
            if (storedUser) {
              localStorage.setItem('currentUser', JSON.stringify(storedUser));
            }
            if (token) {
              localStorage.setItem('token', token);
            }
            // Navegar a login (si quieres que vaya a login después del registro)
            this.router.navigate(['/auth/login']);
            return loginSuccess({ user: storedUser });
          }),
          catchError((error) => of(loginFailure({ error })))
        )
      )
    )
  );

  login$ = createEffect(() =>
    this.actions$.pipe(
      ofType(login),
      exhaustMap(({ email, password }) =>
        this.AuthenticationService.login(email, password).pipe(
          map((resp: any) => {
            // Normalizar respuesta defensivamente:
            // formatos soportados: { user: {...}, token: '...' }  OR { data: {...}, token: '...' } OR user en raíz
            const storedUser = resp?.user ?? resp?.data ?? resp ?? null;
            const token = resp?.token ?? resp?.data?.token ?? resp?.user?.token ?? storedUser?.token ?? localStorage.getItem('token');

            // Persistencia defensiva
            if (storedUser) {
              localStorage.setItem('currentUser', JSON.stringify(storedUser));
            } else {
              localStorage.removeItem('currentUser');
            }

            if (token) {
              localStorage.setItem('token', token);
            }

            // Debemos devolver una acción para que el effect despache algo
            return loginSuccess({ user: storedUser });
          }),
          catchError((error) => of(loginFailure({ error })))
        )
      )
    )
  );

  // 🎯 Efecto para redireccionar según rol después del login exitoso
  loginSuccessRedirect$ = createEffect(() =>
    this.actions$.pipe(
      ofType(loginSuccess),
      // 🔄 Evitar múltiples redirecciones con distinctUntilChanged
      distinctUntilChanged((prev: any, curr: any) => {
        const prevUserId = prev.user?.id ?? prev.user?.email;
        const currUserId = curr.user?.id ?? curr.user?.email;
        return prevUserId === currUserId;
      }),
      // 🕐 Pequeño delay para evitar conflictos de navegación
      debounceTime(50),
      tap(({ user }: any) => {
        const role = user?.role ?? user?.data?.role ?? 'OP';
        const userId = user?.id ?? user?.data?.id ?? 'unknown';
        const userName = user?.name ?? user?.data?.name ?? 'Unknown User';
        
        console.log('🚀 LOGIN SUCCESS REDIRECT - User:', userName, 'ID:', userId, 'Role:', role);
        
        // 🎭 Actualizar menús basados en el rol del usuario
        console.log('🎭 Updating menu items for role:', role);
        this.menuService.updateMenuItems();
        
        // 🚀 Redirección basada en roles del backend
        switch (role) {
          case 'DEV': // Desarrollador
          case 'GG':  // Gerente General
          case 'INGPL': // Ingeniero de Planta
          case 'INGPR': // Ingeniero de Producción
            // Roles con acceso al dashboard
            console.log('✅ Redirecting to dashboard for role:', role);
            setTimeout(() => {
              this.router.navigateByUrl('/');
              // Forzar actualización del menú después de la navegación
              setTimeout(() => this.menuService.forceUpdateMenuItems(role), 200);
            }, 100);
            break;
            
          case 'TRZ': // Trazabilidad
          case 'OP':  // Operador
            // Roles que van directo al Kanban
            console.log('✅ Redirecting to Kanban for role:', role);
            setTimeout(() => {
              this.router.navigateByUrl('/apps/kanbanboard');
              // Forzar actualización del menú después de la navegación
              setTimeout(() => this.menuService.forceUpdateMenuItems(role), 200);
            }, 100);
            break;
            
          default:
            // Por seguridad, si el rol no es reconocido, va al Kanban
            console.warn('⚠️ Unknown role:', role, '- Redirecting to Kanban');
            setTimeout(() => {
              this.router.navigateByUrl('/apps/kanbanboard');
              // Forzar actualización del menú después de la navegación
              setTimeout(() => this.menuService.forceUpdateMenuItems('OP'), 200);
            }, 100);
            break;
        }
      })
    ),
    { dispatch: false }
  );

  signInWithFacebook$ = createEffect(() =>
    this.actions$.pipe(
      ofType(signInWithFacebook),
      exhaustMap(() =>
        from(this.AuthenticationService.signInWithFacebook()).pipe(
          map((resp: any) => {
            const user = resp?.user ?? resp?.data ?? resp ?? null;
            const token = resp?.token ?? resp?.data?.token ?? user?.token ?? localStorage.getItem('token');
            if (user) {
              localStorage.setItem('currentUser', JSON.stringify(user));
            }
            if (token) {
              localStorage.setItem('token', token);
            }
            return loginSuccess({ user });
          }),
          catchError(error => of(loginFailure({ error })))
        )
      )
    )
  );

  signInWithGoogle$ = createEffect(() =>
    this.actions$.pipe(
      ofType(signInWithGoogle),
      exhaustMap(() =>
        from(this.AuthenticationService.signInWithGoogle()).pipe(
          map((resp: any) => {
            const user = resp?.user ?? resp?.data ?? resp ?? null;
            const token = resp?.token ?? resp?.data?.token ?? user?.token ?? localStorage.getItem('token');
            if (user) {
              localStorage.setItem('currentUser', JSON.stringify(user));
            }
            if (token) {
              localStorage.setItem('token', token);
            }
            return loginSuccess({ user });
          }),
          catchError(error => of(loginFailure({ error })))
        )
      )
    )
  );

  logout$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logout),
      exhaustMap(() =>
        this.AuthenticationService.logoutFromBackend().pipe(
          map((response: any) => {
            console.log('Backend logout successful:', response);
            
            // Limpiar almacenamiento local después de la respuesta del backend
            localStorage.removeItem('currentUser');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Actualizar el BehaviorSubject del servicio
            this.AuthenticationService.clearCurrentUser();
            
            // Firebase logout (si está configurado)
            this.AuthenticationService.afAuth.signOut().catch(error => {
              console.warn('Firebase logout error:', error);
            });
            
            // Pequeño delay antes de redirigir para asegurar que el estado se actualice
            setTimeout(() => {
              console.log('Redirecting to login after logout...');
              this.router.navigate(['/auth/login']).then(success => {
                if (success) {
                  console.log('Navigation to login successful');
                } else {
                  console.error('Navigation to login failed');
                }
              });
            }, 100);
            
            return logoutSuccess();
          }),
          catchError((error: any) => {
            console.error('Backend logout failed, but continuing with local logout:', error);
            
            // Aunque falle el backend, limpiamos los datos locales
            localStorage.removeItem('currentUser');
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            
            // Actualizar el BehaviorSubject del servicio
            this.AuthenticationService.clearCurrentUser();
            
            // Firebase logout
            this.AuthenticationService.afAuth.signOut().catch(fbError => {
              console.warn('Firebase logout error:', fbError);
            });
            
            // Redirigir al login de todas formas
            setTimeout(() => {
              console.log('Redirecting to login after logout error...');
              this.router.navigate(['/auth/login']).then(success => {
                if (success) {
                  console.log('Navigation to login successful after error');
                } else {
                  console.error('Navigation to login failed after error');
                }
              });
            }, 100);
            
            // Reportar el error pero marcar el logout como exitoso localmente
            const errorMessage = error?.message || 'Backend logout failed';
            console.warn(`Logout completed locally despite backend error: ${errorMessage}`);
            
            return of(logoutSuccess());
          })
        )
      )
    )
  );

  // Effect que reacciona al logoutSuccess para acciones adicionales
  logoutSuccess$ = createEffect(() =>
    this.actions$.pipe(
      ofType(logoutSuccess),
      tap(() => {
        // Acciones adicionales después del logout exitoso
        console.log('Logout process completed successfully');
        
        // 🎉 Mostrar alerta de logout exitoso
        this.alertService.logoutSuccess();
        
        // Limpiar otros datos de la aplicación
        sessionStorage.clear();
        
        // Limpiar cualquier dato del usuario en el BehaviorSubject
        this.AuthenticationService.clearCurrentUser();
      })
    ),
    { dispatch: false } // No despachar más acciones para evitar ciclos
  );  

  constructor(
    @Inject(Actions) private actions$: Actions,
    private AuthenticationService: AuthenticationService,
    private menuService: MenuService,
    private router: Router,
    private alertService: AlertService) { }

}