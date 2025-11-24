import { Injectable } from '@angular/core';
import { LayoutState } from 'src/app/store/reducers/layout-reducers';

interface LayoutSettings {
  id: string;
  version: string;
  timestamp: Date;
  userId?: string;
  layout: LayoutState;
}

@Injectable({
  providedIn: 'root'
})
export class IndexedDBLayoutService {
  private readonly DB_NAME = 'ToliboyrLayoutDB';
  private readonly DB_VERSION = 1;
  private readonly STORE_NAME = 'layoutSettings';
  private readonly SETTINGS_KEY = 'userLayoutPreferences';
  private db: IDBDatabase | null = null;

  constructor() {
    this.initDB();
  }

  /**
   * Inicializa la base de datos IndexedDB
   */
  private async initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onerror = () => {
        console.error('❌ Error opening IndexedDB:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log('✅ IndexedDB initialized successfully');
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        
        // Crear object store si no existe
        if (!db.objectStoreNames.contains(this.STORE_NAME)) {
          const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('userId', 'userId', { unique: false });
          console.log('✅ IndexedDB object store created');
        }
      };
    });
  }

  /**
   * Guarda la configuración del layout en IndexedDB
   */
  async saveLayoutSettings(layoutState: LayoutState, userId?: string): Promise<void> {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not initialized, falling back to localStorage');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);

      const settings: LayoutSettings = {
        id: this.SETTINGS_KEY,
        version: '1.0',
        timestamp: new Date(),
        userId: userId,
        layout: layoutState
      };

      const request = store.put(settings);

      request.onsuccess = () => {
        console.log('✅ Layout settings saved to IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Error saving to IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Carga la configuración del layout desde IndexedDB
   */
  async loadLayoutSettings(userId?: string): Promise<LayoutState | null> {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not initialized');
      return null;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(this.SETTINGS_KEY);

      request.onsuccess = () => {
        const result = request.result as LayoutSettings;
        
        if (result) {
          // Verificar si es para el usuario correcto (si se especifica)
          if (userId && result.userId !== userId) {
            console.log('ℹ️ Settings found but for different user');
            resolve(null);
            return;
          }
          
          console.log('✅ Layout settings loaded from IndexedDB');
          resolve(result.layout);
        } else {
          console.log('ℹ️ No layout settings found in IndexedDB');
          resolve(null);
        }
      };

      request.onerror = () => {
        console.error('❌ Error loading from IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Elimina la configuración guardada
   */
  async clearLayoutSettings(): Promise<void> {
    if (!this.db) {
      console.warn('⚠️ IndexedDB not initialized');
      return;
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.delete(this.SETTINGS_KEY);

      request.onsuccess = () => {
        console.log('✅ Layout settings cleared from IndexedDB');
        resolve();
      };

      request.onerror = () => {
        console.error('❌ Error clearing IndexedDB:', request.error);
        reject(request.error);
      };
    });
  }

  /**
   * Obtiene información sobre la configuración guardada
   */
  async getStorageInfo(): Promise<any> {
    if (!this.db) {
      return { hasSettings: false, error: 'IndexedDB not initialized' };
    }

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
      const store = transaction.objectStore(this.STORE_NAME);
      const request = store.get(this.SETTINGS_KEY);

      request.onsuccess = () => {
        const result = request.result as LayoutSettings;
        
        if (result) {
          resolve({
            hasSettings: true,
            version: result.version,
            timestamp: result.timestamp,
            userId: result.userId
          });
        } else {
          resolve({ hasSettings: false });
        }
      };

      request.onerror = () => {
        reject(request.error);
      };
    });
  }

  /**
   * Exporta la configuración para backup
   */
  async exportSettings(): Promise<string | null> {
    const settings = await this.loadLayoutSettings();
    if (settings) {
      return JSON.stringify(settings, null, 2);
    }
    return null;
  }

  /**
   * Importa configuración desde backup
   */
  async importSettings(settingsJson: string, userId?: string): Promise<void> {
    try {
      const layoutState = JSON.parse(settingsJson) as LayoutState;
      await this.saveLayoutSettings(layoutState, userId);
      console.log('✅ Settings imported successfully');
    } catch (error) {
      console.error('❌ Error importing settings:', error);
      throw error;
    }
  }
}