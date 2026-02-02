import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchesService } from '../../services/batches.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch } from '../../models/batch.model';

interface BatchTimeline {
  batch: Batch;
  progress: number;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  statusLabel: string;

}

@Component({
  selector: 'app-batches-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './batches-tracking.component.html'
})
export class BatchesTrackingComponent implements OnInit, OnDestroy {
  batches = signal<Batch[]>([]);
  timelines = signal<BatchTimeline[]>([]);
  filteredTimelines = signal<BatchTimeline[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);
  searchFilter = signal('');
  statusFilter = signal('all'); // all, active, completed, at-risk
  isModalOpenDetail?: boolean;
  isModalOpen?: boolean;
  selectedBatchId?: number;
  batchData?: any = null;
  editBatch: any = {};
  isSaving = signal(false);

  private destroy$ = new Subject<void>();

  constructor(private batchesService: BatchesService, private alert: AlertService) { }

  ngOnInit(): void {
    this.loadBatches();
  }

  loadBatches(): void {
    this.loading.set(true);
    this.error.set(null);

    this.batchesService
      .list({}, 1, 999)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const batchesData = res.data || [];
          this.batches.set(batchesData);
          this.buildTimelines(batchesData);
          this.applyFilters();
          this.loading.set(false);
        },
        error: (err) => {
          const message = err?.message || 'Error cargando lotes';
          this.error.set(message);
          this.alert.error('Error', message);
          this.loading.set(false);
        }
      });
  }

  private buildTimelines(batches: Batch[]): void {
    const now = new Date();
    const timelines: BatchTimeline[] = batches.map(batch => {
      const startDate = batch.start_date ? new Date(batch.start_date) : now;
      const endDate = batch.actual_end_date ? new Date(batch.actual_end_date) : null;
      const expectedEnd = batch.expected_end_date ? new Date(batch.expected_end_date) : now;

      const daysElapsed = Math.floor((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const totalDaysPlanned = Math.floor((expectedEnd.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
      const daysRemaining = Math.max(0, totalDaysPlanned - daysElapsed);
      const progress = totalDaysPlanned > 0 ? Math.min(100, (daysElapsed / totalDaysPlanned) * 100) : 0;

      // Mapear el estado del backend a una etiqueta legible y priorizar estado real/fecha
      let statusLabel = 'En Progreso';
      const s = batch.status;
      if (endDate) {
        statusLabel = 'Completado';
      } else if (s === 'cancelled') {
        statusLabel = 'Cancelado';
      } else if (s === 'delivered') {
        statusLabel = 'Entregado';
      } else if (now > expectedEnd && s !== 'completed') {
        statusLabel = 'Retrasado';
      } else {
        // Fallback mapping
        if (s === 'planned') statusLabel = 'Planificado';
        else if (s === 'in_process') statusLabel = 'En Progreso';
        else if (s === 'paused') statusLabel = 'Pausado';
        else if (s === 'completed') statusLabel = 'Completado';
        else statusLabel = 'En Progreso';
      }

      return {
        batch,
        progress: Math.round(progress),
        daysElapsed: Math.max(0, daysElapsed),
        estimatedDaysRemaining: daysRemaining,
        statusLabel
      };
    });

    this.timelines.set(timelines);
  }

  applyFilters(): void {
    let filtered = this.timelines();
    const search = this.searchFilter().toLowerCase();
    const status = this.statusFilter();

    // Filtro de búsqueda
    if (search) {
      filtered = filtered.filter(
        t =>
          t.batch.name?.toLowerCase().includes(search) ||
          t.batch.code?.toLowerCase().includes(search) ||
          t.batch.id?.toString().includes(search)
      );
    }

    // Filtro de estado
    if (status !== 'all') {
      filtered = filtered.filter(t => {
        if (status === 'active') return t.batch.status === 'in_progress';
        if (status === 'completed') return t.batch.status === 'completed';
        if (status === 'at-risk') return t.statusLabel === 'Retrasado';
        return true;
      });
    }

    this.filteredTimelines.set(filtered);
  }

  onSearchChange(): void {
    this.applyFilters();
  }

  onStatusFilterChange(): void {
    this.applyFilters();
  }

  clearFilters(): void {
    this.searchFilter.set('');
    this.statusFilter.set('all');
    this.applyFilters();
  }

  getProgressBarClass(timeline: BatchTimeline): string {
    if (timeline.statusLabel === 'Retrasado') return 'bg-danger';
    if (timeline.statusLabel === 'Completado') return 'bg-success';
    if (timeline.progress >= 75) return 'bg-warning';
    return 'bg-primary';
  }

  getStatusBadgeClass(timeline: BatchTimeline): string {
    const batch = timeline.batch || ({} as Batch);
    const raw = (batch.status ?? '').toString();

    // Calcular etiqueta en español de forma determinista según campos actuales
    let spanishLabel = 'En Progreso';
    const now = new Date();
    const expected = batch.expected_end_date ? new Date(batch.expected_end_date) : null;

    if (batch.actual_end_date) {
      spanishLabel = 'Completado';
    } else if (raw === 'cancelled') {
      spanishLabel = 'Cancelado';
    } else if (raw === 'delivered') {
      spanishLabel = 'Entregado';
    } else if (expected && now > expected && raw !== 'completed') {
      spanishLabel = 'Retrasado';
    } else {
      switch (raw) {
        case 'planned': spanishLabel = 'Planificado'; break;
        case 'in_process': spanishLabel = 'En Progreso'; break;
        case 'paused': spanishLabel = 'Pausado'; break;
        case 'completed': spanishLabel = 'Completado'; break;
        default: spanishLabel = 'En Progreso';
      }
    }

    // Guardar el label calculado en el timeline para uso posterior en template
    timeline.statusLabel = spanishLabel;

    // Seleccionar clase de badge según la etiqueta en español
    switch (spanishLabel) {
      case 'Retrasado':
      case 'Cancelado':
        return 'bg-danger';
      case 'Completado':
      case 'Entregado':
        return 'bg-success';
      case 'Pausado':
        return 'bg-warning';
      case 'Planificado':
        return 'bg-secondary';
      default:
        return 'bg-info';
    }
  }
  getDefectBadgeClass(batch: Batch): string {
    const qty = Number(batch.quantity) || 0;
    const defects = Number(batch.defect_quantity) || 0;
    const defectRate = qty > 0 ? (defects / qty) * 100 : 0;
    if (defectRate > 10) return 'bg-danger';
    if (defectRate > 5) return 'bg-warning';
    return 'bg-success';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  viewBatchTimeline(batchId: number): void {
    // Abrir modal y poblar sólo los campos que maneja el formulario
    this.isModalOpen = true;
    this.selectedBatchId = batchId;

    const found = this.batches().find(b => b.id === batchId);
    if (found) {
      // solo llevamos actual_end_date y defect_quantity (y id)
      const edit: any = { id: found.id };
      if (found.actual_end_date) {
        // Convertir ISO a formato compatible con datetime-local: yyyy-MM-ddTHH:mm
        const d = new Date(found.actual_end_date);
        const pad = (n: number) => n.toString().padStart(2, '0');
        const local = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
        edit.actual_end_date = local;
      }
      edit.defect_quantity = found.defect_quantity ?? 0;
      // inicializar estado actual para que el select muestre el valor correcto
      if (found.status !== undefined) {
        edit.status = found.status;
      }
      this.editBatch = edit;
    } else {
      this.editBatch = { id: batchId, defect_quantity: 0 };
    }
  }

  onSaveBatch(): void {
    // Construir objeto con los campos a actualizar
    const updates: any = {};
    if (this.editBatch.actual_end_date) {
      const dt = new Date(this.editBatch.actual_end_date);
      updates.actual_end_date = dt.toISOString();
    }
    if (this.editBatch.defect_quantity !== undefined) {
      updates.defect_quantity = Number(this.editBatch.defect_quantity) || 0;
    }

    if (!this.editBatch.id) {
      this.alert.error('Error', 'ID de lote inválido');
      return;
    }

    // Preparar payload completo (fusión con datos actuales)
    const existing = this.batches().find(b => b.id === this.editBatch.id) || ({} as Batch);
    const payload = { ...existing, ...updates };

    // Incluir status si el usuario lo cambió en el formulario
    if (this.editBatch.status !== undefined && this.editBatch.status !== existing.status) {
      payload.status = this.editBatch.status;
      updates.status = this.editBatch.status;
    }

    console.debug('Payload to update batch:', payload);

    // Indicar estado de guardado y deshabilitar controles
    this.isSaving.set(true);

    // Llamar al servicio para persistir los cambios; no cerramos la modal
    // hasta confirmar que la operación fue exitosa.
    const batchId = Number(this.editBatch.id);
    this.batchesService.update(batchId, payload).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        console.debug('Batches update response:', res);
        const updated = res.data;
        if (updated) {
          // Reemplazar en la lista local con la respuesta normalizada del servidor
          const idx = this.batches().findIndex(b => b.id === updated.id);
          if (idx !== -1) {
            const current = [...this.batches()];
            current[idx] = { ...current[idx], ...updated };
            this.batches.set(current);
          }
          this.buildTimelines(this.batches());
          this.applyFilters();
          this.alert.success('Guardado', 'Los cambios del lote se guardaron en el servidor.');
        } else {
          this.alert.success('Guardado', 'Actualizado localmente (sin datos de respuesta).');
        }
        this.isSaving.set(false);
        this.isModalOpen = false;
        this.editBatch = {};
      },
      error: (err) => {
        const message = err?.message || 'Error guardando los cambios';
        console.error('Error update batch:', err);
        this.alert.error('Error', message);
        // Recargar lista para sincronizar estado con servidor
        this.isSaving.set(false);
        this.loadBatches();
      }
    });
  }

  onCancelEdit(): void {
    this.editBatch = {};
    this.isModalOpen = false;
  }

  viewBatchDetails(batchId: number): void {
    // Lógica para abrir el modal de detalles del lote
    // asignamos el id inmediatamente y solicitamos los datos; abrimos la modal
    // sólo cuando tengamos la información para mostrar en el header.
    this.selectedBatchId = batchId;
    this.batchData = null;

    this.batchesService.getById(batchId).pipe(takeUntil(this.destroy$)).subscribe({
      next: (res) => {
        const batchData = res.data;
        if (batchData) {
          // Asignar los datos para que el template pueda mostrarlos
          this.batchData = batchData;
          this.selectedBatchId = batchData.id;
          this.isModalOpenDetail = true;
        } else {
          this.alert.error('Error', 'No se encontraron detalles del lote');
        }
      },
      error: (err) => {
        const message = err?.message || 'Error cargando detalles del lote';
        this.alert.error('Error', message);
      }
    });
  }

  closeModal(): void {
    this.isModalOpen = false;
    this.isModalOpenDetail = false;
    this.batchData = null;
  }
}
