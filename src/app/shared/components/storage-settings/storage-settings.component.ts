import { Component, OnInit } from '@angular/core';
import { LayoutStorageManagerService, StorageType } from 'src/app/core/services/layout-storage-manager.service';

@Component({
  selector: 'app-storage-settings',
  template: `
    <div class="card">
      <div class="card-header">
        <h6 class="card-title mb-0">
          <i class="bi bi-hdd-stack me-2"></i>
          Configuración de Almacenamiento
        </h6>
      </div>
      <div class="card-body">
        
        <!-- Tipo de almacenamiento -->
        <div class="mb-3">
          <label class="form-label fw-semibold">Tipo de almacenamiento</label>
          <select class="form-select" [(ngModel)]="selectedStorageType" (change)="onStorageTypeChange()">
            <option value="auto">Automático (Recomendado)</option>
            <option value="localStorage">Local Storage</option>
            <option value="indexedDB" [disabled]="!storageInfo?.isIndexedDBAvailable">
              IndexedDB {{ !storageInfo?.isIndexedDBAvailable ? '(No disponible)' : '' }}
            </option>
          </select>
          <small class="text-muted">
            Actual: {{ storageInfo?.activeStorage }}
          </small>
        </div>

        <!-- Información del almacenamiento -->
        <div class="row g-3" *ngIf="storageInfo">
          
          <!-- LocalStorage Info -->
          <div class="col-md-6">
            <div class="border rounded p-3">
              <h6 class="text-primary mb-2">
                <i class="bi bi-archive me-1"></i>
                Local Storage
              </h6>
              <div class="d-flex justify-content-between">
                <small>Estado:</small>
                <small class="fw-medium">{{ storageInfo.localStorage?.hasSettings ? 'Con datos' : 'Vacío' }}</small>
              </div>
              <div class="d-flex justify-content-between" *ngIf="storageInfo.localStorage?.timestamp">
                <small>Actualizado:</small>
                <small>{{ formatDate(storageInfo.localStorage.timestamp) }}</small>
              </div>
            </div>
          </div>

          <!-- IndexedDB Info -->
          <div class="col-md-6">
            <div class="border rounded p-3">
              <h6 class="text-success mb-2">
                <i class="bi bi-database me-1"></i>
                IndexedDB
              </h6>
              <div class="d-flex justify-content-between">
                <small>Disponible:</small>
                <small class="fw-medium">{{ storageInfo.isIndexedDBAvailable ? 'Sí' : 'No' }}</small>
              </div>
              <div class="d-flex justify-content-between" *ngIf="storageInfo.indexedDB?.hasSettings">
                <small>Estado:</small>
                <small class="fw-medium">{{ storageInfo.indexedDB?.hasSettings ? 'Con datos' : 'Vacío' }}</small>
              </div>
            </div>
          </div>
        </div>

        <!-- Acciones -->
        <div class="mt-3 pt-3 border-top">
          <div class="row g-2">
            <div class="col-md-6">
              <button class="btn btn-outline-primary w-100 btn-sm" 
                      [disabled]="!storageInfo?.isIndexedDBAvailable || !storageInfo?.localStorage?.hasSettings"
                      (click)="migrateToIndexedDB()">
                <i class="bi bi-arrow-right me-1"></i>
                Migrar a IndexedDB
              </button>
            </div>
            <div class="col-md-6">
              <button class="btn btn-outline-danger w-100 btn-sm" 
                      (click)="clearAllData()"
                      [disabled]="!hasAnyData()">
                <i class="bi bi-trash me-1"></i>
                Limpiar Todo
              </button>
            </div>
          </div>
        </div>

        <!-- Debug Info (solo en desarrollo) -->
        <div class="mt-3 pt-3 border-top" *ngIf="showDebugInfo">
          <details>
            <summary class="text-muted small">Debug Info</summary>
            <pre class="small mt-2 p-2 bg-light rounded">{{ storageInfo | json }}</pre>
          </details>
        </div>

      </div>
    </div>
  `,
  styles: [`
    details summary {
      cursor: pointer;
    }
    details summary:hover {
      color: var(--bs-primary) !important;
    }
    pre {
      max-height: 200px;
      overflow-y: auto;
    }
  `]
})
export class StorageSettingsComponent implements OnInit {
  selectedStorageType: StorageType = 'auto';
  storageInfo: any = null;
  showDebugInfo = false; // Cambiar a true para mostrar info de debug

  constructor(private storageManager: LayoutStorageManagerService) {}

  async ngOnInit() {
    this.selectedStorageType = this.storageManager.getActiveStorageType();
    await this.loadStorageInfo();
  }

  async loadStorageInfo() {
    try {
      this.storageInfo = await this.storageManager.getStorageInfo();
    } catch (error) {
      console.error('Error loading storage info:', error);
    }
  }

  onStorageTypeChange() {
    this.storageManager.setStorageType(this.selectedStorageType);
    this.loadStorageInfo();
  }

  async migrateToIndexedDB() {
    try {
      const success = await this.storageManager.migrateToIndexedDB();
      if (success) {
        console.log('✅ Migration completed successfully');
        await this.loadStorageInfo();
      } else {
        console.log('ℹ️ No data to migrate');
      }
    } catch (error) {
      console.error('❌ Migration failed:', error);
    }
  }

  async clearAllData() {
    if (confirm('¿Estás seguro de que quieres eliminar toda la configuración guardada?')) {
      try {
        await this.storageManager.clearAllSettings();
        console.log('✅ All data cleared');
        await this.loadStorageInfo();
      } catch (error) {
        console.error('❌ Error clearing data:', error);
      }
    }
  }

  hasAnyData(): boolean {
    return this.storageInfo?.localStorage?.hasSettings || 
           this.storageInfo?.indexedDB?.hasSettings;
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  }
}