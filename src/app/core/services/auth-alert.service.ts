import { Injectable } from '@angular/core';
import { AlertService } from './alert.service';

@Injectable({
  providedIn: 'root'
})
export class AuthAlertService {

  constructor(private alertService: AlertService) {}

  /**
   * 🔐 Alertas específicas de Login
   */
  loginAlerts = {
    // ✅ Login exitoso
    success: (username?: string) => {
      const message = username ? `¡Bienvenido de vuelta, ${username}!` : 'Has iniciado sesión exitosamente';
      return this.alertService.success('¡Bienvenido!', message, 4000);
    },

    // ❌ Credenciales incorrectas
    invalidCredentials: () => {
      return this.alertService.authAlert('error', 
        'Credenciales incorrectas', 
        'Verifica tu email y contraseña e intenta nuevamente'
      );
    },

    // 🔒 Cuenta bloqueada
    accountLocked: () => {
      return this.alertService.authAlert('error',
        'Cuenta Bloqueada',
        'Tu cuenta ha sido bloqueada temporalmente. Contacta al administrador.'
      );
    },

    // ⏰ Sesión expirada
    sessionExpired: () => {
      return this.alertService.warning(
        'Sesión Expirada',
        'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.'
      );
    },

    // 🌐 Error de conexión
    networkError: () => {
      return this.alertService.error(
        'Error de Conexión',
        'No se pudo conectar al servidor. Verifica tu conexión a internet.'
      );
    },

    // 🔄 Cargando login
    loading: () => {
      return this.alertService.loading('Iniciando Sesión...', 'Verificando credenciales');
    }
  };

  /**
   * 🚪 Alertas específicas de Logout
   */
  logoutAlerts = {
    // ❓ Confirmación de logout
    confirm: () => {
      return this.alertService.confirmLogout();
    },

    // ✅ Logout exitoso
    success: () => {
      return this.alertService.logoutSuccess();
    },

    // 🔄 Procesando logout
    loading: () => {
      return this.alertService.loading('Cerrando Sesión...', 'Terminando tu sesión de forma segura');
    },

    // ⚠️ Forzar logout por inactividad
    inactivity: () => {
      return this.alertService.warning(
        'Sesión por Inactividad',
        'Tu sesión ha sido cerrada por inactividad por seguridad.'
      );
    },

    // 🚫 Logout forzado por admin
    forced: () => {
      return this.alertService.error(
        'Sesión Terminada',
        'Tu sesión ha sido terminada por el administrador.'
      );
    }
  };

  /**
   * 📝 Alertas específicas de Registro
   */
  registerAlerts = {
    // ✅ Registro exitoso
    success: (name: string) => {
      return this.alertService.authAlert('register',
        `¡Bienvenido ${name}!`,
        'Tu cuenta ha sido creada exitosamente. Ya puedes usar la aplicación.'
      );
    },

    // 📧 Email ya existe
    emailExists: () => {
      return this.alertService.authAlert('error',
        'Email Ya Registrado',
        'Este email ya está en uso. Intenta con otro email o inicia sesión.'
      );
    },

    // 🔑 Contraseña débil
    weakPassword: () => {
      return this.alertService.warning(
        'Contraseña Débil',
        'La contraseña debe tener al menos 8 caracteres, incluyendo mayúsculas, minúsculas y números.'
      );
    },

    // ✉️ Verificación de email
    emailVerification: () => {
      return this.alertService.info(
        'Verifica tu Email',
        'Hemos enviado un enlace de verificación a tu correo electrónico.'
      );
    }
  };

  /**
   * 🔄 Alertas de cambio de contraseña
   */
  passwordAlerts = {
    // ✅ Contraseña cambiada
    changeSuccess: () => {
      return this.alertService.success(
        'Contraseña Actualizada',
        'Tu contraseña ha sido cambiada exitosamente.'
      );
    },

    // 📧 Email de recuperación enviado
    resetSent: () => {
      return this.alertService.info(
        'Email Enviado',
        'Hemos enviado instrucciones para recuperar tu contraseña a tu email.'
      );
    },

    // ❌ Contraseña actual incorrecta
    currentWrong: () => {
      return this.alertService.error(
        'Contraseña Incorrecta',
        'La contraseña actual que ingresaste no es correcta.'
      );
    }
  };

  /**
   * 🛡️ Alertas de seguridad
   */
  securityAlerts = {
    // 🚨 Intento de acceso sospechoso
    suspiciousLogin: () => {
      return this.alertService.warning(
        'Actividad Sospechosa',
        'Se detectó un intento de acceso desde una ubicación inusual.'
      );
    },

    // 🔐 2FA requerido
    twoFactorRequired: () => {
      return this.alertService.info(
        'Verificación Requerida',
        'Por favor ingresa el código de verificación de dos factores.'
      );
    },

    // ✅ 2FA exitoso
    twoFactorSuccess: () => {
      return this.alertService.toast('success', 'Verificación exitosa');
    }
  };

  /**
   * 🎯 Método rápido para diferentes escenarios
   */
  showScenario(scenario: string, data?: any) {
    switch (scenario) {
      case 'login-success':
        return this.loginAlerts.success(data?.username);
      
      case 'login-failed':
        return this.loginAlerts.invalidCredentials();
      
      case 'logout-confirm':
        return this.logoutAlerts.confirm();
      
      case 'logout-success':
        return this.logoutAlerts.success();
      
      case 'session-expired':
        return this.loginAlerts.sessionExpired();
      
      case 'register-success':
        return this.registerAlerts.success(data?.name);
      
      case 'network-error':
        return this.loginAlerts.networkError();
      
      default:
        return this.alertService.info('Notificación', 'Escenario no definido');
    }
  }
}