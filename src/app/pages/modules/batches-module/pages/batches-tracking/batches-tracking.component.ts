import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BatchesService } from '../../services/batches.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch } from '../../models/batch.model';
import { BatchDetailsComponent } from '../../components/batch-details/batch-details.component';

interface BatchTimeline {
  batch: Batch;
  progress: number;
  daysElapsed: number;
  estimatedDaysRemaining: number;
  delayDays: number;
  statusLabel: string;
  statusClass: string;
  progressBarClass: string;
  defectBadgeClass: string;
  defectRate: number;
  isDelayed: boolean;
}

@Component({
  selector: 'app-batches-tracking',
  standalone: true,
  imports: [CommonModule, FormsModule, BatchDetailsComponent],
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
  batchData: Batch | null = null;
  editBatch: any = {};
  isSaving = signal(false);

  private readonly DAY_IN_MS = 1000 * 60 * 60 * 24;
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
      const startDate = this.toDate(batch.start_date) ?? now;
      const expectedEnd = this.toDate(batch.expected_end_date);
      const actualEnd = this.toDate(batch.actual_end_date);
      const activeReference = actualEnd ?? now;

      const plannedDurationDays = expectedEnd
        ? Math.max(1, Math.ceil((expectedEnd.getTime() - startDate.getTime()) / this.DAY_IN_MS))
        : Math.max(1, Math.ceil((activeReference.getTime() - startDate.getTime()) / this.DAY_IN_MS));

      const daysElapsed = Math.max(0, Math.ceil((activeReference.getTime() - startDate.getTime()) / this.DAY_IN_MS));
      let progress = Math.min(100, (daysElapsed / plannedDurationDays) * 100);
      if (actualEnd) {
        progress = 100;
      }

      const estimatedDaysRemaining = actualEnd || !expectedEnd
        ? 0
        : Math.max(0, Math.ceil((expectedEnd.getTime() - now.getTime()) / this.DAY_IN_MS));

      const delayDays = actualEnd || !expectedEnd
        ? 0
        : Math.max(0, Math.ceil((now.getTime() - expectedEnd.getTime()) / this.DAY_IN_MS));

      const isDelayed = delayDays > 0;
      const { label: statusLabel, badgeClass: statusClass } = this.resolveStatus(batch, actualEnd, isDelayed);
      const progressBarClass = actualEnd ? 'bg-success' : isDelayed ? 'bg-danger' : progress >= 90 ? 'bg-warning' : 'bg-primary';
      const { defectBadgeClass, defectRate } = this.resolveDefects(batch);

      return {
        batch,
        progress: Math.round(progress),
        daysElapsed,
        estimatedDaysRemaining,
        delayDays,
        statusLabel,
        statusClass,
        progressBarClass,
        defectBadgeClass,
        defectRate,
        isDelayed
      };
    });

    this.timelines.set(timelines);
  }

  applyFilters(): void {
    let filtered = this.timelines();
    const search = this.searchFilter().trim().toLowerCase();
    const status = this.statusFilter();

    // Filtro de búsqueda
    if (search) {
      filtered = filtered.filter(t => {
        const pool = [
          t.batch.name,
          t.batch.code,
          t.batch.product_name,
          t.batch.product_id ? t.batch.product_id.toString() : undefined,
          t.batch.id ? t.batch.id.toString() : undefined,
          t.statusLabel,
          t.batch.notes
        ];
        return pool.some(value => value?.toLowerCase().includes(search));
      });
    }

    // Filtro de estado
    if (status !== 'all') {
      filtered = filtered.filter(t => {
        if (status === 'active') {
          return ['Planificado', 'En Progreso', 'Pausado'].includes(t.statusLabel);
        }
        if (status === 'completed') {
          return ['Completado', 'Entregado', 'Cancelado'].includes(t.statusLabel);
        }
        if (status === 'at-risk') {
          return t.isDelayed;
        }
        return true;
      });
    }

    filtered.sort((a, b) => {
      if (a.isDelayed !== b.isDelayed) {
        return a.isDelayed ? -1 : 1;
      }
      if (!!a.batch.actual_end_date !== !!b.batch.actual_end_date) {
        return a.batch.actual_end_date ? 1 : -1;
      }
      return (a.batch.start_date || '').localeCompare(b.batch.start_date || '');
    });

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

  private resolveStatus(batch: Batch, actualEnd: Date | null, isDelayed: boolean) {
    const raw = batch.status ?? '';
    let label = 'En Progreso';

    if (actualEnd) {
      label = 'Completado';
    } else if (raw === 'cancelled') {
      label = 'Cancelado';
    } else if (raw === 'delivered') {
      label = 'Entregado';
    } else if (isDelayed) {
      label = 'Retrasado';
    } else {
      switch (raw) {
        case 'planned':
          label = 'Planificado';
          break;
        case 'in_process':
          label = 'En Progreso';
          break;
        case 'paused':
          label = 'Pausado';
          break;
        case 'completed':
          label = 'Completado';
          break;
        default:
          label = 'En Progreso';
      }
    }

    const badgeMap: Record<string, string> = {
      Retrasado: 'bg-danger',
      Cancelado: 'bg-danger',
      Completado: 'bg-success',
      Entregado: 'bg-success',
      Planificado: 'bg-secondary',
      Pausado: 'bg-warning',
      'En Progreso': 'bg-info'
    };

    return { label, badgeClass: badgeMap[label] || 'bg-info' };
  }

  private resolveDefects(batch: Batch) {
    const qty = Number(batch.quantity) || 0;
    const defects = Number(batch.defect_quantity) || 0;
    const defectRate = qty > 0 ? (defects / qty) * 100 : 0;
    let defectBadgeClass = 'bg-success';
    if (defectRate > 10) {
      defectBadgeClass = 'bg-danger';
    } else if (defectRate > 5) {
      defectBadgeClass = 'bg-warning';
    }
    return { defectBadgeClass, defectRate };
  }

  private toDate(value?: string | null): Date | null {
    if (!value) {
      return null;
    }
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  viewBatchTimeline(batchId?: number): void {
    if (batchId == null) {
      this.alert.error('Error', 'ID de lote inválido');
      return;
    }

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

  viewBatchDetails(batchId?: number): void {
    if (batchId == null) {
      this.alert.error('Error', 'ID de lote inválido');
      return;
    }

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
