import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot, CanActivate } from '@angular/router';
import { AuthenticationService } from '../services/auth.service';
import { MenuService } from '../services/menu.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  
  constructor(
    private router: Router,
    private authService: AuthenticationService,
    private menuService: MenuService
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    const currentUser = this.authService.currentUserValue;
    const localStorageUser = localStorage.getItem('currentUser');
    
    //console.log('🔍 ROLE GUARD CHECK - Route:', state.url);
    //console.log('🔍 ROLE GUARD CHECK - Current User from Service:', currentUser);
    //console.log('🔍 ROLE GUARD CHECK - LocalStorage User:', localStorageUser);

    if (!currentUser) {
      //console.log('❌ ROLE GUARD - No current user, redirecting to login');
      this.router.navigate(['/auth/signin']);
      return false;
    }

    // Verificar si el usuario tiene acceso a esta ruta según su menú
    const hasAccess = this.menuService.hasAccessToRoute(state.url);
    
    if (!hasAccess) {
      // No tiene acceso, redirigir según el rol del backend
      const userRole = currentUser.role || 'OP';
      //console.log('🚫 ROLE GUARD - Access denied for role:', userRole, 'to route:', state.url);
      
      // Usar el método del MenuService para obtener la ruta por defecto
      const defaultRoute = this.menuService.getDefaultRouteByRole(userRole);
      //console.log('🔄 ROLE GUARD - Redirecting to default route:', defaultRoute);
      this.router.navigate([defaultRoute]);
      return false;
    }

    //console.log('✅ ROLE GUARD - Access granted for role:', currentUser.role, 'to route:', state.url);
    return true;
  }
}