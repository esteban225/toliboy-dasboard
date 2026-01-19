import { Injectable } from '@angular/core';
import { LayoutState } from 'src/app/store/reducers/layout-reducers';
import { LayoutPersistenceService } from './layout-persistence.service';
import { IndexedDBLayoutService } from './indexeddb-layout.service';

export type StorageType = 'localStorage' | 'indexedDB' | 'auto';

@Injectable({
  providedIn: 'root'
})
export class LayoutStorageManagerService {
  private currentStorageType: StorageType = 'auto';
  private isIndexedDBAvailable = false;

  constructor(
    private localStorageService: LayoutPersistenceService,
    private indexedDBService: IndexedDBLayoutService
  ) {
    this.checkIndexedDBSupport();
  }

  /**
   * Verifica si IndexedDB está disponible
   */
  private async checkIndexedDBSupport(): Promise<void> {
    try {
      if ('indexedDB' in window) {
        // Intentar una operación simple para verificar que funciona
        const testDB = indexedDB.open('test-db-support');
        testDB.onsuccess = () => {
          this.isIndexedDBAvailable = true;
          testDB.result.close();
          indexedDB.deleteDatabase('test-db-support');
          console.log('✅ IndexedDB is available');
        };
        testDB.onerror = () => {
          this.isIndexedDBAvailable = false;
          console.log('⚠️ IndexedDB not available, falling back to localStorage');
        };
      } else {
        this.isIndexedDBAvailable = false;
        console.log('⚠️ IndexedDB not supported, using localStorage');
      }
    } catch (error) {
      this.isIndexedDBAvailable = false;
      console.log('⚠️ IndexedDB check failed, using localStorage');
    }
  }

  /**
   * Configura el tipo de almacenamiento preferido
   */
  setStorageType(type: StorageType): void {
    this.currentStorageType = type;
    console.log(`🔧 Storage type set to: ${type}`);
  }

  /**
   * Obtiene el tipo de almacenamiento activo
   */
  getActiveStorageType(): StorageType {
    if (this.currentStorageType === 'auto') {
      return this.isIndexedDBAvailable ? 'indexedDB' : 'localStorage';
    }
    return this.currentStorageType;
  }

  /**
   * Guarda la configuración usando el almacenamiento preferido
   */
  async saveLayoutSettings(layoutState: LayoutState, userId?: string): Promise<void> {
    const activeStorage = this.getActiveStorageType();
    
    try {
      switch (activeStorage) {
        case 'indexedDB':
          await this.indexedDBService.saveLayoutSettings(layoutState, userId);
          break;
        case 'localStorage':
        default:
          this.localStorageService.saveLayoutSettings(layoutState);
          break;
      }
    } catch (error) {
      console.error(`❌ Error saving with ${activeStorage}, trying fallback:`, error);
      
      // Fallback al otro método si falla
      if (activeStorage === 'indexedDB') {
        this.localStorageService.saveLayoutSettings(layoutState);
      } else if (this.isIndexedDBAvailable) {
        await this.indexedDBService.saveLayoutSettings(layoutState, userId);
      }
    }
  }

  /**
   * Carga la configuración usando el almacenamiento preferido
   */
  async loadLayoutSettings(userId?: string): Promise<Partial<LayoutState> | null> {
    const activeStorage = this.getActiveStorageType();
    
    try {
      switch (activeStorage) {
        case 'indexedDB':
          return await this.indexedDBService.loadLayoutSettings(userId);
        case 'localStorage':
        default:
          return this.localStorageService.loadLayoutSettings();
      }
    } catch (error) {
      console.error(`❌ Error loading with ${activeStorage}, trying fallback:`, error);
      
      // Fallback al otro método si falla
      if (activeStorage === 'indexedDB') {
        return this.localStorageService.loadLayoutSettings();
      } else if (this.isIndexedDBAvailable) {
        return await this.indexedDBService.loadLayoutSettings(userId);
      }
      return null;
    }
  }

  /**
   * Limpia la configuración de ambos almacenamientos
   */
  async clearAllSettings(): Promise<void> {
    try {
      this.localStorageService.clearLayoutSettings();
      if (this.isIndexedDBAvailable) {
        await this.indexedDBService.clearLayoutSettings();
      }
      console.log('✅ All layout settings cleared');
    } catch (error) {
      console.error('❌ Error clearing settings:', error);
    }
  }

  /**
   * Migra configuración de localStorage a IndexedDB
   */
  async migrateToIndexedDB(userId?: string): Promise<boolean> {
    if (!this.isIndexedDBAvailable) {
      console.warn('⚠️ IndexedDB not available for migration');
      return false;
    }

    try {
      const localSettings = this.localStorageService.loadLayoutSettings();
      if (localSettings) {
        await this.indexedDBService.saveLayoutSettings(localSettings as LayoutState, userId);
        console.log('✅ Settings migrated to IndexedDB');
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Migration failed:', error);
      return false;
    }
  }

  /**
   * Obtiene información del almacenamiento activo
   */
  async getStorageInfo(): Promise<any> {
    const activeStorage = this.getActiveStorageType();
    
    const info = {
      activeStorage,
      isIndexedDBAvailable: this.isIndexedDBAvailable,
      localStorage: this.localStorageService.getStorageInfo(),
      indexedDB: null as any
    };

    if (this.isIndexedDBAvailable) {
      try {
        info.indexedDB = await this.indexedDBService.getStorageInfo();
      } catch (error) {
        info.indexedDB = { error: error };
      }
    }

    return info;
  }

  /**
   * Exporta configuración para backup
   */
  async exportSettings(): Promise<string | null> {
    const activeStorage = this.getActiveStorageType();
    
    try {
      if (activeStorage === 'indexedDB' && this.isIndexedDBAvailable) {
        return await this.indexedDBService.exportSettings();
      } else {
        const settings = this.localStorageService.loadLayoutSettings();
        return settings ? JSON.stringify(settings, null, 2) : null;
      }
    } catch (error) {
      console.error('❌ Export failed:', error);
      return null;
    }
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
      console.error('❌ Import failed:', error);
      throw error;
    }
  }
}