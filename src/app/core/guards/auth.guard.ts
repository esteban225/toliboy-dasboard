import { Injectable } from '@angular/core';
import { Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Store } from '@ngrx/store';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

// Auth Services
import { AuthfakeauthenticationService } from '../services/authfake.service';
import  {AuthenticationService} from '../services/auth.service'
import { environment } from '../../../environments/environment';
import { RootReducerState } from 'src/app/store/reducers';
import { getisLoggedIn } from 'src/app/store/reducers/authentication.reducer';

@Injectable({ providedIn: 'root' })
export class AuthGuard  {
    constructor(
        private router: Router,
        private authenticationService: AuthenticationService,
        private authFackservice: AuthfakeauthenticationService
    ) { }

    canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot) {
        if (environment.defaultauth === 'firebase') {
            const currentUser = this.authenticationService.currentUserValue;
            if (currentUser) {
                // logged in so return true
                return true;
            }
        } else if (environment.defaultauth === 'fackbackend') {
            // Para API backend, verificar tanto currentUser como token
            const currentUser = this.authenticationService.currentUserValue;
            const token = localStorage.getItem('token');
            const storedUser = localStorage.getItem('currentUser');
            
            // Verificar que existan los datos necesarios
            if (currentUser && token && storedUser) {
                try {
                    const parsedUser = JSON.parse(storedUser);
                    if (parsedUser && (parsedUser.token || token)) {
                        return true;
                    }
                } catch (error) {
                    console.error('Error parsing stored user:', error);
                    // Limpiar datos corruptos
                    localStorage.removeItem('currentUser');
                    localStorage.removeItem('token');
                }
            }
        } else {
            // Método fake service
            const currentUser = this.authFackservice.currentUserValue;
            if (currentUser) {
                return true;
            }
            // check if user data is in storage is logged in via API.
            if (localStorage.getItem('currentUser')) {
                return true;
            }
        }
        
        // not logged in so redirect to login page with the return url
        console.log('AuthGuard: User not authenticated, redirecting to login');
        this.router.navigate(['/auth/login'], { queryParams: { returnUrl: state.url } });
        return false;
    }
}
