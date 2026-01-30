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

      let statusLabel = 'En Progreso';
      if (endDate) {
        statusLabel = 'Completado';
      } else if (now > expectedEnd) {
        statusLabel = 'Retrasado';
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
    if (timeline.statusLabel === 'Retrasado') return 'bg-danger';
    if (timeline.statusLabel === 'Completado') return 'bg-success';
    return 'bg-info';
  }

  getDefectBadgeClass(batch: Batch): string {
    const defectRate = batch.quantity ? ((batch.defect_quantity ?? 0) / batch.quantity) * 100 : 0;
    if (defectRate > 10) return 'bg-danger';
    if (defectRate > 5) return 'bg-warning';
    return 'bg-success';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  viewBatchTimeline(batchId: number): void {
    // Lógica para abrir el modal de seguimiento del lote
    this.isModalOpen = true;
    this.selectedBatchId = batchId;
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
