import { Injectable } from '@angular/core';
import Swal from 'sweetalert2';

@Injectable({
  providedIn: 'root'
})
export class AlertService {

  constructor() { }

  /**
   * 🎉 Alerta de éxito
   */
  success(title: string, message?: string, timer: number = 3000) {
    return Swal.fire({
      icon: 'success',
      title: title,
      text: message,
      timer: timer,
      timerProgressBar: true,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
  }

  /**
   * ❌ Alerta de error
   */
  error(title: string, message?: string) {
    return Swal.fire({
      icon: 'error',
      title: title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#d33'
    });
  }

  /**
   * ⚠️ Alerta de advertencia
   */
  warning(title: string, message?: string) {
    return Swal.fire({
      icon: 'warning',
      title: title,
      text: message,
      confirmButtonText: 'Entendido',
      confirmButtonColor: '#f39c12'
    });
  }

  /**
   * ℹ️ Alerta de información
   */
  info(title: string, message?: string) {
    return Swal.fire({
      icon: 'info',
      title: title,
      text: message,
      confirmButtonText: 'OK',
      confirmButtonColor: '#3085d6'
    });
  }

  /**
   * ❓ Alerta de confirmación
   */
  confirm(title: string, message?: string, confirmText: string = 'Sí', cancelText: string = 'No') {
    return Swal.fire({
      icon: 'question',
      title: title,
      text: message,
      showCancelButton: true,
      confirmButtonText: confirmText,
      cancelButtonText: cancelText,
      confirmButtonColor: '#3085d6',
      cancelButtonColor: '#d33'
    });
  }

  /**
   * 🔄 Alerta de carga
   */
  loading(title: string, message?: string) {
    return Swal.fire({
      title: title,
      text: message,
      allowOutsideClick: false,
      allowEscapeKey: false,
      showConfirmButton: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });
  }

  /**
   * 🚪 Confirmación de logout
   */
  confirmLogout() {
    return this.confirm(
      '¿Cerrar Sesión?',
      '¿Estás seguro de que deseas cerrar la sesión?',
      'Sí, cerrar sesión',
      'Cancelar'
    );
  }

  /**
   * ✅ Éxito de login
   */
  loginSuccess(username?: string) {
    const message = username ? `Bienvenido, ${username}!` : 'Has iniciado sesión exitosamente';
    return this.success('¡Bienvenido!', message);
  }

  /**
   * 🚪 Éxito de logout
   */
  logoutSuccess() {
    return this.success(
      'Sesión Cerrada', 
      'Has cerrado sesión correctamente. ¡Hasta pronto!',
      2000
    );
  }

  /**
   * 📱 Toast simple (esquina superior)
   */
  toast(icon: 'success' | 'error' | 'warning' | 'info', title: string, timer: number = 3000) {
    return Swal.fire({
      icon: icon,
      title: title,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: timer,
      timerProgressBar: true,
      didOpen: (toast) => {
        toast.addEventListener('mouseenter', Swal.stopTimer);
        toast.addEventListener('mouseleave', Swal.resumeTimer);
      }
    });
  }

  /**
   * 🎨 Alerta personalizada para autenticación
   */
  authAlert(type: 'login' | 'logout' | 'register' | 'error', message: string, details?: string) {
    const configs = {
      login: {
        icon: 'success' as const,
        title: '¡Bienvenido!',
        color: '#28a745'
      },
      logout: {
        icon: 'info' as const,
        title: 'Sesión Cerrada',
        color: '#17a2b8'
      },
      register: {
        icon: 'success' as const,
        title: '¡Registro Exitoso!',
        color: '#28a745'
      },
      error: {
        icon: 'error' as const,
        title: 'Error de Autenticación',
        color: '#dc3545'
      }
    };

    const config = configs[type];

    return Swal.fire({
      icon: config.icon,
      title: config.title,
      text: message,
      footer: details,
      confirmButtonColor: config.color,
      confirmButtonText: 'Continuar'
    });
  }

  /**
   * 🔄 Cerrar cualquier alerta abierta
   */
  close() {
    Swal.close();
  }
}