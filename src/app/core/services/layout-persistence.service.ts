import { Injectable } from '@angular/core';
import { LayoutState } from 'src/app/store/reducers/layout-reducers';

@Injectable({
  providedIn: 'root'
})
export class LayoutPersistenceService {
  private readonly STORAGE_KEY = 'toliboy_layout_settings';
  private readonly STORAGE_VERSION = '1.0';

  constructor() {}

  /**
   * Guarda la configuración del layout en localStorage
   */
  saveLayoutSettings(layoutState: LayoutState): void {
    try {
      const settingsToSave = {
        version: this.STORAGE_VERSION,
        timestamp: new Date().toISOString(),
        layout: {
          LAYOUT_THEME: layoutState.LAYOUT_THEME,
          LAYOUT_MODE: layoutState.LAYOUT_MODE,
          LAYOUT_WIDTH: layoutState.LAYOUT_WIDTH,
          LAYOUT_POSITION: layoutState.LAYOUT_POSITION,
          TOPBAR: layoutState.TOPBAR,
          SIDEBAR_SIZE: layoutState.SIDEBAR_SIZE,
          SIDEBAR_VIEW: layoutState.SIDEBAR_VIEW,
          SIDEBAR_COLOR: layoutState.SIDEBAR_COLOR,
          SIDEBAR_IMAGE: layoutState.SIDEBAR_IMAGE,
          DATA_PRELOADER: layoutState.DATA_PRELOADER
        }
      };

      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settingsToSave));
      console.log('✅ Layout settings saved to localStorage');
    } catch (error) {
      console.error('❌ Error saving layout settings:', error);
    }
  }

  /**
   * Carga la configuración del layout desde localStorage
   */
  loadLayoutSettings(): Partial<LayoutState> | null {
    try {
      const storedSettings = localStorage.getItem(this.STORAGE_KEY);
      
      if (!storedSettings) {
        console.log('ℹ️ No layout settings found in localStorage');
        return null;
      }

      const parsedSettings = JSON.parse(storedSettings);
      
      // Verificar versión de compatibilidad
      if (parsedSettings.version !== this.STORAGE_VERSION) {
        console.warn('⚠️ Layout settings version mismatch, using defaults');
        this.clearLayoutSettings();
        return null;
      }

      console.log('✅ Layout settings loaded from localStorage');
      return parsedSettings.layout;
    } catch (error) {
      console.error('❌ Error loading layout settings:', error);
      this.clearLayoutSettings();
      return null;
    }
  }

  /**
   * Limpia la configuración guardada
   */
  clearLayoutSettings(): void {
    try {
      localStorage.removeItem(this.STORAGE_KEY);
      console.log('✅ Layout settings cleared from localStorage');
    } catch (error) {
      console.error('❌ Error clearing layout settings:', error);
    }
  }

  /**
   * Verifica si hay configuración guardada
   */
  hasStoredSettings(): boolean {
    return localStorage.getItem(this.STORAGE_KEY) !== null;
  }

  /**
   * Obtiene información de la configuración guardada
   */
  getStorageInfo(): any {
    try {
      const storedSettings = localStorage.getItem(this.STORAGE_KEY);
      if (!storedSettings) return null;

      const parsedSettings = JSON.parse(storedSettings);
      return {
        version: parsedSettings.version,
        timestamp: parsedSettings.timestamp,
        hasSettings: true
      };
    } catch (error) {
      return null;
    }
  }
}