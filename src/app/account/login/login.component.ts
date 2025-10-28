import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, UntypedFormBuilder, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Store, select } from '@ngrx/store';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { TokenStorageService } from 'src/app/core/services/token-storage.service';
import { login, signInWithFacebook, signInWithGoogle } from 'src/app/store/actions/authentication.actions';
import { AlertService } from 'src/app/core/services/alert.service';

interface LoginResponse {
  token?: string;
  [key: string]: any;
}

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  submitted = false;
  errorMessage = '';
  fieldTextType = false; // 👈 para mostrar/ocultar contraseña
  year: number = new Date().getFullYear(); // 👈 para el footer

  constructor(
    private formBuilder: UntypedFormBuilder, 
    private store: Store, 
    private router: Router, 
    private route: ActivatedRoute, 
    private AuthenticationService: AuthenticationService,
    private alertService: AlertService
  ) {
    // redirect to home if already logged in
    // this.store.select(state => state.Authentication).subscribe(authState => {
    //   this.isLoggedIn = !!authState.user;
    //   this.currentUser = authState.user;
    // });

    if (this.AuthenticationService.currentUserValue) {
      this.router.navigate(['/']);
    }
  }

  ngOnInit(): void {
    this.loginForm = this.formBuilder.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });
  }

  // ✅ getter para los campos del formulario (usado como f['email'])
  get f() {
    return this.loginForm.controls;
  }

  // ✅ alternar visibilidad del campo de contraseña
  toggleFieldTextType(): void {
    this.fieldTextType = !this.fieldTextType;
  }

  // ✅ método principal de login
  onSubmit(): void {
    this.submitted = true;
    this.errorMessage = '';
    
    if (this.loginForm.invalid) return;

    const { email, password } = this.loginForm.value;

    // Dispatch login action to NgRx store
    this.store.dispatch(login({ email: email, password: password }));
    
    // También podemos hacer login directo para backward compatibility
    // this.AuthenticationService.login(email, password).subscribe({
    //   next: (user) => {
    //     this.router.navigate(['/']);
    //   },
    //   error: (error) => {
    //     this.errorMessage = error;
    //   }
    // });
  }

  // ✅ Login con Facebook - Usa Redux para manejar redirección
  signInWithFacebook(): void {
    this.AuthenticationService.signInWithFacebook()
      .then((result) => {
        // La redirección se maneja automáticamente por los efectos de Redux
        console.log('Facebook login successful, redirect handled by Redux effects');
      })
      .catch((error) => {
        this.errorMessage = error.message || 'Facebook login failed';
      });
  }

  // ✅ Login con Google - Usa Redux para manejar redirección
  signInWithGoogle(): void {
    this.AuthenticationService.signInWithGoogle()
      .then((result) => {
        // La redirección se maneja automáticamente por los efectos de Redux
        console.log('Google login successful, redirect handled by Redux effects');
      })
      .catch((error) => {
        this.errorMessage = error.message || 'Google login failed';
      });
  }
}
