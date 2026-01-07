import { environment } from '../../../environments/environment';

/**
 * 🔧 Logger condicional - Solo en desarrollo
 * Uso: logger.log('mensaje'), logger.error('error'), etc
 */
export const logger = {
  log: (...args: any[]) => {
    if (!environment.production) {
      console.log(...args);
    }
  },
  error: (...args: any[]) => {
    if (!environment.production) {
      console.error(...args);
    }
  },
  warn: (...args: any[]) => {
    if (!environment.production) {
      console.warn(...args);
    }
  },
  trace: (...args: any[]) => {
    if (!environment.production) {
      console.trace(...args);
    }
  },
  group: (label: string) => {
    if (!environment.production) {
      console.group(label);
    }
  },
  groupEnd: () => {
    if (!environment.production) {
      console.groupEnd();
    }
  }
};
