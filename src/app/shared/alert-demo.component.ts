import { Component } from '@angular/core';
import { AlertService } from '../core/services/alert.service';
import { Store } from '@ngrx/store';
import { logout } from '../store/actions/authentication.actions';

@Component({
  selector: 'app-alert-demo',
  template: `
    <div class="container mt-4">
      <h2>🚨 Demostración de Alertas</h2>
      <div class="row">
        <div class="col-md-6">
          <h4>Alertas Básicas</h4>
          <button class="btn btn-success m-2" (click)="showSuccess()">✅ Éxito</button>
          <button class="btn btn-danger m-2" (click)="showError()">❌ Error</button>
          <button class="btn btn-warning m-2" (click)="showWarning()">⚠️ Advertencia</button>
          <button class="btn btn-info m-2" (click)="showInfo()">ℹ️ Información</button>
        </div>
        <div class="col-md-6">
          <h4>Alertas de Autenticación</h4>
          <button class="btn btn-primary m-2" (click)="showLoginSuccess()">🔐 Login Exitoso</button>
          <button class="btn btn-secondary m-2" (click)="showLogoutSuccess()">🚪 Logout Exitoso</button>
          <button class="btn btn-dark m-2" (click)="showAuthError()">🔒 Error de Auth</button>
        </div>
      </div>
      <div class="row mt-4">
        <div class="col-md-6">
          <h4>Alertas Interactivas</h4>
          <button class="btn btn-warning m-2" (click)="showConfirm()">❓ Confirmación</button>
          <button class="btn btn-danger m-2" (click)="showLogoutConfirm()">🚪 Confirmar Logout</button>
          <button class="btn btn-info m-2" (click)="showLoading()">🔄 Carga (3s)</button>
        </div>
        <div class="col-md-6">
          <h4>Toasts</h4>
          <button class="btn btn-success m-2" (click)="showToastSuccess()">🍞 Toast Éxito</button>
          <button class="btn btn-danger m-2" (click)="showToastError()">🍞 Toast Error</button>
          <button class="btn btn-warning m-2" (click)="showToastWarning()">🍞 Toast Warning</button>
        </div>
      </div>
    </div>
  `
})
export class AlertDemoComponent {

  constructor(
    private alertService: AlertService,
    private store: Store
  ) {}

  // Alertas básicas
  showSuccess() {
    this.alertService.success('¡Operación Exitosa!', 'Todo se completó correctamente');
  }

  showError() {
    this.alertService.error('Error Crítico', 'Algo salió mal, por favor intenta nuevamente');
  }

  showWarning() {
    this.alertService.warning('Advertencia', 'Ten cuidado con esta acción');
  }

  showInfo() {
    this.alertService.info('Información', 'Este es un mensaje informativo');
  }

  // Alertas de autenticación
  showLoginSuccess() {
    this.alertService.loginSuccess('Juan Pérez');
  }

  showLogoutSuccess() {
    this.alertService.logoutSuccess();
  }

  showAuthError() {
    this.alertService.authAlert('error', 'Credenciales incorrectas', 'Verifica tu email y contraseña');
  }

  // Alertas interactivas
  showConfirm() {
    this.alertService.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer')
      .then((result) => {
        if (result.isConfirmed) {
          this.alertService.toast('success', 'Confirmado!');
        } else {
          this.alertService.toast('info', 'Cancelado');
        }
      });
  }

  showLogoutConfirm() {
    this.alertService.confirmLogout()
      .then((result) => {
        if (result.isConfirmed) {
          this.alertService.toast('success', 'Cerrando sesión...');
          // Aquí podrías hacer dispatch del logout real
          // this.store.dispatch(logout());
        } else {
          this.alertService.toast('info', 'Logout cancelado');
        }
      });
  }

  showLoading() {
    this.alertService.loading('Procesando...', 'Por favor espera');
    
    // Simular proceso de 3 segundos
    setTimeout(() => {
      this.alertService.close();
      this.alertService.success('¡Completado!', 'El proceso terminó exitosamente');
    }, 3000);
  }

  // Toasts
  showToastSuccess() {
    this.alertService.toast('success', '¡Guardado exitosamente!');
  }

  showToastError() {
    this.alertService.toast('error', 'Error al guardar');
  }

  showToastWarning() {
    this.alertService.toast('warning', 'Revisa los campos');
  }
}