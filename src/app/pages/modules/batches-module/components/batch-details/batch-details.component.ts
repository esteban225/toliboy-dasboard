import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Batch } from '../../models/batch.model';

@Component({
  selector: 'app-batch-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './batch-details.component.html',
  styleUrls: ['./batch-details.component.scss']
})
export class BatchDetailsComponent {
  @Input() batch?: Batch | null;
  @Input() batchId?: number;
  @Output() close = new EventEmitter<void>();

  get hasData(): boolean {
    return !!this.batch;
  }

  get statusLabel(): string {
    if (!this.batch) {
      return 'Sin estado';
    }

    if (this.batch.actual_end_date) {
      return 'Completado';
    }

    const status = this.batch.status ?? '';
    const map: Record<string, string> = {
      planned: 'Planificado',
      in_process: 'En Progreso',
      paused: 'Pausado',
      completed: 'Completado',
      delivered: 'Entregado',
      cancelled: 'Cancelado'
    };

    return map[status] ?? 'En Progreso';
  }

  get statusClass(): string {
    const label = this.statusLabel;
    const badgeMap: Record<string, string> = {
      Planificado: 'bg-secondary',
      'En Progreso': 'bg-info',
      Pausado: 'bg-warning',
      Completado: 'bg-success',
      Entregado: 'bg-success',
      Cancelado: 'bg-danger'
    };
    return badgeMap[label] ?? 'bg-info';
  }

  emitClose(): void {
    this.close.emit();
  }
}
