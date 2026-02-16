import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil, finalize } from 'rxjs/operators';
import { BatchesService } from '../../services/batches.service';
import { InventoryMovementService } from '../../../inventory-module/services/inventory-movement.service';
import { MaterialReleaseService } from '../../../inventory-module/services/material-release.service';
import { FormResponseService } from '../../../forms-module/services/formResponse.service';
import { ProductsService } from '../../../product-module/services/products.service';
import { UserService } from '../../../user-module/services/user.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Batch } from '../../models/batch.model';

interface BatchTraceability {
  batch: Batch;
  product?: any;
  movements: any[];
  forms: any[];
  materialStats: any;
  timelineEvents: TimelineEvent[];
  qualityMetrics: QualityMetrics;
}

interface TimelineEvent {
  date: string;
  type: 'batch_created' | 'materials_released' | 'status_changed' | 'form_filled' | 'batch_completed';
  title: string;
  description: string;
  user?: string;
}

interface QualityMetrics {
  defectPercentage: number;
  productivityPercentage: number;
  materialEfficiency: number;
  timelineCompliance: boolean;
  statusHealth: string;
}

@Component({
  selector: 'app-batche-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './batche-report.component.html',
  styleUrl: './batche-report.component.scss'
})
export class BatcheReportComponent implements OnInit, OnDestroy {
  destroy$ = new Subject<void>();

  // Búsqueda y filtros
  searchForm: FormGroup;
  searchQuery = '';
  selectedBatchId: number | null = null;

  // Datos
  batchTraceability: BatchTraceability | null = null;
  batches: Batch[] = [];
  isLoading = false;
  reportGenerating = false;

  // Estados
  statusColors: Record<string, string> = {
    planned: '#FFC107',
    in_process: '#0D6EFD',
    paused: '#6C757D',
    completed: '#198754',
    delivered: '#20C997',
    cancelled: '#DC3545'
  };

  // Mapeo de IDs de usuarios a nombres
  private userMap: Map<number | string, string> = new Map();
  // Mapeo de IDs de productos a nombres
  private productMap: Map<number, string> = new Map();

  constructor(
    private fb: FormBuilder,
    private batchesService: BatchesService,
    private invMovementService: InventoryMovementService,
    private materialReleaseService: MaterialReleaseService,
    private formResponseService: FormResponseService,
    private productsService: ProductsService,
    private userService: UserService,
    private alert: AlertService
  ) {
    this.searchForm = this.fb.group({
      batchSearch: ['']
    });
  }

  ngOnInit(): void {
    this.loadUsers();
    this.loadProducts();
    this.loadBatches();
    this.setupSearch();
  }

  /**
   * Carga todos los productos y crea un mapa de ID -> nombre
   */
  private loadProducts(): void {
    this.productsService.list()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (response: any) => {
          const products = response.data || response || [];
          products.forEach((product: any) => {
            this.productMap.set(product.id, product.name || `Producto #${product.id}`);
          });
          console.log('[BATCH-REPORT] Productos cargados:', this.productMap.size);
        },
        error: (err) => {
          console.warn('[BATCH-REPORT] Error cargando productos:', err?.message);
        }
      });
  }

  /**
   * Carga todos los usuarios y crea un mapa de ID -> nombre
   */
  private loadUsers(): void {
    this.userService.getUsers()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (users: any[]) => {
          users.forEach(user => {
            const userId = user.id || user.user_id;
            const userName = user.name || user.email || `Usuario ${userId}`;
            this.userMap.set(userId, userName);
            this.userMap.set(userId.toString(), userName);
          });
          console.log('[BATCH-REPORT] Usuarios cargados:', this.userMap.size);
        },
        error: (err) => {
          console.warn('[BATCH-REPORT] Error cargando usuarios:', err?.message);
        }
      });
  }

  /**
   * Obtiene el nombre del usuario por ID
   */
  getUserName(userId: number | string | undefined): string {
    if (!userId) return 'Sistema';
    return this.userMap.get(userId) || this.userMap.get(userId.toString()) || `Usuario #${userId}`;
  }

  /**
   * Obtiene el nombre del producto por ID
   */
  getProductName(productId: number | undefined): string {
    if (!productId) return 'N/A';
    return this.productMap.get(productId) || `Producto #${productId}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Carga todos los lotes para búsqueda
   */
  loadBatches(): void {
    this.isLoading = true;
    this.batchesService.list({}, 1, 1000)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.isLoading = false)
      )
      .subscribe({
        next: (response) => {
          this.batches = response.data || [];
          console.log('[BATCH-REPORT] Lotes cargados:', this.batches.length);
        },
        error: (err) => {
          console.error('[BATCH-REPORT] Error cargando lotes:', err);
          this.alert.error('Error', 'No se pudieron cargar los lotes');
        }
      });
  }

  /**
   * Configura búsqueda en tiempo real
   */
  setupSearch(): void {
    this.searchForm.get('batchSearch')?.valueChanges
      .pipe(takeUntil(this.destroy$))
      .subscribe(value => {
        this.searchQuery = value?.toLowerCase() || '';
      });
  }

  /**
   * Obtiene lotes filtrados
   */
  get filteredBatches(): Batch[] {
    if (!this.searchQuery) return this.batches;
    return this.batches.filter(b =>
      b.name?.toLowerCase().includes(this.searchQuery) ||
      b.code?.toLowerCase().includes(this.searchQuery) ||
      b.id?.toString().includes(this.searchQuery)
    );
  }

  /**
   * Carga el reporte completo de trazabilidad del lote
   */
  loadBatchTraceability(batchId: number): void {
    if (!batchId) {
      this.alert.warning('Atención', 'Selecciona un lote válido');
      return;
    }

    this.isLoading = true;
    this.selectedBatchId = batchId;
    const batch = this.batches.find(b => b.id === batchId);

    if (!batch) {
      this.alert.error('Error', 'Lote no encontrado');
      this.isLoading = false;
      return;
    }

    console.log('[BATCH-REPORT] Cargando trazabilidad para lote #' + batchId);

    // Cargar todos los datos en paralelo
    Promise.all([
      this.loadBatchMovements(batchId),
      this.loadBatchForms(batchId),
      this.loadBatchMaterialStats(batchId)
    ])
      .then(([movements, forms, materialStats]) => {
        this.batchTraceability = {
          batch,
          product: this.getProductInfo(batch),
          movements,
          forms,
          materialStats,
          timelineEvents: this.buildTimeline(batch, movements, forms),
          qualityMetrics: this.calculateQualityMetrics(batch, movements, forms)
        };
        console.log('[BATCH-REPORT] Trazabilidad completa:', this.batchTraceability);
        this.alert.success('Éxito', 'Trazabilidad del lote cargada correctamente');
      })
      .catch(err => {
        console.error('[BATCH-REPORT] Error crítico en trazabilidad:', err);
        this.alert.error('Error', 'Error al cargar la trazabilidad del lote. Verifiquemos qué datos se pudieron recuperar.');
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

  /**
   * Carga movimientos de inventario del lote (tolerante a errores)
   */
  private loadBatchMovements(batchId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.invMovementService.list({ batch_id: batchId }, 1, 1000)
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response) => {
            console.log('[BATCH-REPORT] Movimientos cargados:', response.data?.length || 0);
            resolve(response.data || []);
          },
          error: (err) => {
            console.warn('[BATCH-REPORT] Error cargando movimientos, continuando sin ellos:', err?.message || err);
            resolve([]); // Resolver con array vacío en lugar de rechazar
          }
        });
    });
  }

  /**
   * Carga formularios asociados al lote (tolerante a errores)
   */
  private loadBatchForms(batchId: number): Promise<any[]> {
    return new Promise((resolve) => {
      this.formResponseService.getFormResponses({ batch_id: batchId, per_page: 400 })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (response: any) => {
            console.log('[BATCH-REPORT] Formularios cargados:', response.data?.length || 0);
            resolve(response.data || []);
          },
          error: (err) => {
            console.warn('[BATCH-REPORT] Error cargando formularios, continuando sin ellos:', err?.message || err?.status);
            resolve([]); // Resolver con array vacío en lugar de rechazar
          }
        });
    });
  }

  /**
   * Carga estadísticas de materiales del lote (tolerante a errores)
   */
  private loadBatchMaterialStats(batchId: number): Promise<any> {
    return new Promise((resolve) => {
      // Obtener materiales liberados del servicio
      this.materialReleaseService.getPendingReleaseBatches()
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (batches) => {
            const batchData = batches.find(b => b.batch?.id === batchId);
            if (batchData) {
              const stats = {
                totalMaterials: batchData.requiredMaterials.length,
                materialsReleased: batchData.requiredMaterials.filter((m: any) => m.hasSufficientStock).length,
                totalQuantity: batchData.requiredMaterials.reduce((sum: number, m: any) => sum + (m.totalQuantityNeeded || 0), 0),
                materials: batchData.requiredMaterials
              };
              console.log('[BATCH-REPORT] Estadísticas de materiales:', stats);
              resolve(stats);
            } else {
              resolve({ totalMaterials: 0, materialsReleased: 0, materials: [] });
            }
          },
          error: (err) => {
            console.warn('[BATCH-REPORT] Error cargando estadísticas de materiales:', err?.message || err);
            resolve({ totalMaterials: 0, materialsReleased: 0, totalQuantity: 0, materials: [] });
          }
        });
    });
  }

  /**
   * Obtiene información del producto asociado
   */
  private getProductInfo(batch: Batch): any {
    // En una implementación real, buscarías en productsService
    // Por ahora retornamos datos desde el batch
    return {
      id: batch.product_id,
      name: batch.product_name,
      code: batch.code
    };
  }

  /**
   * Construye timeline de eventos del lote
   */
  private buildTimeline(batch: Batch, movements: any[], forms: any[]): TimelineEvent[] {
    const events: TimelineEvent[] = [];

    // Evento de creación
    if (batch.created_at) {
      events.push({
        date: new Date(batch.created_at).toLocaleString('es-ES'),
        type: 'batch_created',
        title: 'Lote Creado',
        description: `Lote #${batch.id} creado con ${batch.quantity} unidades`,
        user: this.getUserName(batch.created_by)
      });
    }

    // Eventos de movimientos (liberaciones)
    movements.forEach((mov, idx) => {
      if (mov.created_at) {
        events.push({
          date: new Date(mov.created_at).toLocaleString('es-ES'),
          type: 'materials_released',
          title: 'Material Liberado',
          description: `${mov.quantity} unidades ${mov.type === 'out' ? 'salida' : 'entrada'} - ${mov.notes || 'Sin observaciones'}`,
          user: this.getUserName(mov.created_by)
        });
      }
    });

    // Eventos de cambio de estado
    if (batch.status === 'in_process' && batch.updated_at) {
      events.push({
        date: new Date(batch.updated_at).toLocaleString('es-ES'),
        type: 'status_changed',
        title: 'Estado Actualizado',
        description: `Lote cambió a estado: ${this.getStatusLabel(batch.status)}`,
        user: undefined
      });
    }

    // Eventos de formularios
    forms.forEach(form => {
      if (form.created_at) {
        events.push({
          date: new Date(form.created_at).toLocaleString('es-ES'),
          type: 'form_filled',
          title: 'Formulario Completado',
          description: `Formulario: ${form.form_name || 'Sin nombre'}`,
          user: this.getUserName(form.answered_by)
        });
      }
    });

    // Evento de completación
    if (batch.status === 'completed' && batch.actual_end_date) {
      events.push({
        date: new Date(batch.actual_end_date).toLocaleString('es-ES'),
        type: 'batch_completed',
        title: 'Lote Completado',
        description: `Lote completado con ${batch.defect_quantity || 0} defectos`,
        user: undefined
      });
    }

    return events.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }

  /**
   * Calcula métricas de calidad
   */
  private calculateQualityMetrics(batch: Batch, movements: any[], forms: any[]): QualityMetrics {
    const quantity = batch.quantity || 1;
    const defects = batch.defect_quantity || 0;
    const defectPercentage = (defects / quantity) * 100;

    const startDate = batch.start_date ? new Date(batch.start_date) : new Date();
    const expectedEnd = batch.expected_end_date ? new Date(batch.expected_end_date) : new Date();
    const actualEnd = batch.actual_end_date ? new Date(batch.actual_end_date) : new Date();
    const timelineCompliance = actualEnd <= expectedEnd;

    const materialEfficiency = batch.quantity ? ((quantity - defects) / quantity) * 100 : 100;

    return {
      defectPercentage: Math.round(defectPercentage * 100) / 100,
      productivityPercentage: Math.round(((quantity - defects) / quantity) * 100 * 100) / 100,
      materialEfficiency: Math.round(materialEfficiency * 100) / 100,
      timelineCompliance,
      statusHealth: batch.status === 'completed' ? 'Completado' :
                    batch.status === 'in_process' ? 'En Proceso' :
                    batch.status === 'planned' ? 'Planificado' : 'Pausado'
    };
  }

  /**
   * Obtiene etiqueta del estado
   */
  getStatusLabel(status?: string): string {
    const labels: Record<string, string> = {
      planned: 'Planificado',
      in_process: 'En Proceso',
      paused: 'Pausado',
      completed: 'Completado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };
    return labels[status || 'planned'] || status || 'Desconocido';
  }

  /**
   * Obtiene color del estado
   */
  getStatusBgClass(status?: string): string {
    const classes: Record<string, string> = {
      planned: 'bg-warning',
      in_process: 'bg-info',
      paused: 'bg-secondary',
      completed: 'bg-success',
      delivered: 'bg-success',
      cancelled: 'bg-danger'
    };
    return classes[status || 'planned'] || 'bg-secondary';
  }

  /**
   * Genera reporte PDF
   */
  generatePDF(): void {
    if (!this.batchTraceability) {
      this.alert.warning('Atención', 'Carga un lote primero');
      return;
    }

    this.reportGenerating = true;
    console.log('[BATCH-REPORT] Generando PDF...');

    try {
      // Estructura HTML para PDF
      let htmlContent = this.buildPDFContent();

      // Usar técnica de impresión para generar PDF
      const printWindow = window.open('', '', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.print();
          this.reportGenerating = false;
        }, 250);
      }
    } catch (error) {
      console.error('[BATCH-REPORT] Error generando PDF:', error);
      this.alert.error('Error', 'No se pudo generar el PDF');
      this.reportGenerating = false;
    }
  }

  /**
   * Construye contenido HTML para PDF
   */
  private buildPDFContent(): string {
    if (!this.batchTraceability) return '';

    const b = this.batchTraceability;
    const metrics = b.qualityMetrics;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Reporte Lote #${b.batch.id}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
          h1 { color: #0D6EFD; border-bottom: 3px solid #0D6EFD; padding-bottom: 10px; }
          h2 { color: #495057; margin-top: 30px; }
          .header { display: flex; justify-content: space-between; margin-bottom: 20px; }
          .batch-info { background: #F8F9FA; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
          .info-row { display: flex; justify-content: space-between; margin-bottom: 8px; }
          .info-label { font-weight: bold; width: 30%; }
          .metrics-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0; }
          .metric-card { background: #F8F9FA; padding: 12px; border-left: 4px solid #0D6EFD; }
          .metric-value { font-size: 24px; font-weight: bold; color: #0D6EFD; }
          .metric-label { font-size: 12px; color: #6C757D; }
          table { width: 100%; border-collapse: collapse; margin: 15px 0; }
          th { background: #0D6EFD; color: white; padding: 10px; text-align: left; }
          td { border: 1px solid #DEE2E6; padding: 10px; }
          tr:nth-child(even) { background: #F8F9FA; }
          .status-badge { display: inline-block; padding: 5px 12px; border-radius: 20px; font-weight: bold; }
          .page-break { page-break-after: always; }
          footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #DEE2E6; font-size: 11px; color: #6C757D; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>REPORTE DE TRAZABILIDAD</h1>
          <div style="text-align: right;">
            <strong>Lote #${b.batch.id}</strong><br>
            <small>${new Date().toLocaleString('es-ES')}</small>
          </div>
        </div>

        <!-- Información General -->
        <div class="batch-info">
          <h2>Información General del Lote</h2>
          <div class="info-row">
            <span class="info-label">ID:</span>
            <span>${b.batch.id}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Nombre:</span>
            <span>${b.batch.name}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Código:</span>
            <span>${b.batch.code || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Producto:</span>
            <span>${b.batch.product_name || 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Estado:</span>
            <span class="status-badge" style="background: ${this.statusColors[b.batch.status || 'planned']}; color: white;">
              ${this.getStatusLabel(b.batch.status)}
            </span>
          </div>
          <div class="info-row">
            <span class="info-label">Cantidad:</span>
            <span>${b.batch.quantity} unidades</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha Inicio:</span>
            <span>${b.batch.start_date ? new Date(b.batch.start_date).toLocaleString('es-ES') : 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha Esperada:</span>
            <span>${b.batch.expected_end_date ? new Date(b.batch.expected_end_date).toLocaleString('es-ES') : 'N/A'}</span>
          </div>
          <div class="info-row">
            <span class="info-label">Fecha Real:</span>
            <span>${b.batch.actual_end_date ? new Date(b.batch.actual_end_date).toLocaleString('es-ES') : 'En progreso'}</span>
          </div>
        </div>

        <!-- Métricas de Calidad -->
        <h2>Métricas de Calidad</h2>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-value">${metrics.defectPercentage}%</div>
            <div class="metric-label">Tasa de Defectos</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.productivityPercentage}%</div>
            <div class="metric-label">Productividad</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.materialEfficiency}%</div>
            <div class="metric-label">Eficiencia de Materiales</div>
          </div>
          <div class="metric-card">
            <div class="metric-value">${metrics.timelineCompliance ? 'Sí' : 'No'}</div>
            <div class="metric-label">Cumplimiento Timeline</div>
          </div>
        </div>

        <!-- Materiales Liberados -->
        <div class="page-break"></div>
        <h2>Materiales Liberados (${b.materialStats.materialsReleased}/${b.materialStats.totalMaterials})</h2>
        ${b.materialStats.materials.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Material</th>
                <th>Cantidad Requerida</th>
                <th>Stock Actual</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              ${b.materialStats.materials.map((m: any) => `
                <tr>
                  <td>${m.rawMaterialName} (${m.rawMaterialCode})</td>
                  <td>${m.totalQuantityNeeded}</td>
                  <td>${m.currentStock}</td>
                  <td class="status-badge" style="background: ${m.hasSufficientStock ? '#198754' : '#DC3545'}; color: white;">
                    ${m.hasSufficientStock ? 'Liberado' : 'Insuficiente'}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No hay materiales registrados</p>'}

        <!-- Movimientos de Inventario -->
        <div class="page-break"></div>
        <h2>Movimientos de Inventario (${b.movements.length})</h2>
        ${b.movements.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Cantidad</th>
                <th>Línea de Producción</th>
                <th>Notas</th>
              </tr>
            </thead>
            <tbody>
              ${b.movements.map((m: any) => `
                <tr>
                  <td>${m.created_at ? new Date(m.created_at).toLocaleString('es-ES') : 'N/A'}</td>
                  <td>${m.type === 'in' ? 'Entrada' : 'Salida'}</td>
                  <td>${m.quantity}</td>
                  <td>${m.production_line || 'N/A'}</td>
                  <td>${m.notes || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No hay movimientos registrados</p>'}

        <!-- Formularios Completados -->
        <div class="page-break"></div>
        <h2>Formularios Completados (${b.forms.length})</h2>
        ${b.forms.length > 0 ? `
          <table>
            <thead>
              <tr>
                <th>Formulario</th>
                <th>Fecha</th>
                <th>Respondido por</th>
              </tr>
            </thead>
            <tbody>
              ${b.forms.map((f: any) => `
                <tr>
                  <td>${f.form_name || 'Sin nombre'}</td>
                  <td>${f.created_at ? new Date(f.created_at).toLocaleString('es-ES') : 'N/A'}</td>
                  <td>${f.answered_by || 'Desconocido'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : '<p>No hay formularios registrados</p>'}

        <!-- Timeline -->
        <div class="page-break"></div>
        <h2>Timeline de Eventos</h2>
        ${b.timelineEvents.map((evt: TimelineEvent, idx: number) => `
          <div style="margin-bottom: 15px; padding-left: 20px; border-left: 3px solid #0D6EFD;">
            <strong>${evt.title}</strong><br>
            <small>${evt.date}</small><br>
            <span style="color: #6C757D;">${evt.description}</span>
          </div>
        `).join('')}

        <footer>
          <p>Este reporte fue generado automáticamente por el sistema de Trazabilidad de Lotes.</p>
          <p>Para consultas, contacta al departamento de calidad.</p>
        </footer>
      </body>
      </html>
    `;
  }

  /**
   * Descarga datos en CSV
   */
  downloadCSV(): void {
    if (!this.batchTraceability) return;

    const b = this.batchTraceability;
    let csv = 'REPORTE DE TRAZABILIDAD DEL LOTE\n\n';
    
    csv += `Lote,${b.batch.id}\n`;
    csv += `Nombre,${b.batch.name}\n`;
    csv += `Producto,${b.batch.product_name}\n`;
    csv += `Estado,${this.getStatusLabel(b.batch.status)}\n`;
    csv += `Cantidad,${b.batch.quantity}\n\n`;

    csv += 'MATERIALES LIBERADOS\n';
    csv += 'Material,Código,Cantidad Requerida,Stock Actual,Estado\n';
    b.materialStats.materials.forEach((m: any) => {
      csv += `"${m.rawMaterialName}","${m.rawMaterialCode}",${m.totalQuantityNeeded},${m.currentStock},"${m.hasSufficientStock ? 'Liberado' : 'Insuficiente'}"\n`;
    });

    csv += '\nMOVIMIENTOS DE INVENTARIO\n';
    csv += 'Fecha,Tipo,Cantidad,Línea,Notas\n';
    b.movements.forEach((m: any) => {
      csv += `"${m.created_at}","${m.type}",${m.quantity},"${m.production_line}","${m.notes}"\n`;
    });

    const link = document.createElement('a');
    link.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
    link.download = `reporte-lote-${b.batch.id}-${new Date().getTime()}.csv`;
    link.click();

    this.alert.success('Éxito', 'Reporte CSV descargado');
  }
}
