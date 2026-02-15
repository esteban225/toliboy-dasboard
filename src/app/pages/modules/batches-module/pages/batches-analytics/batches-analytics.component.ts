import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatchesService } from '../../services/batches.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch } from '../../models/batch.model';

interface BatchMetrics {
  totalBatches: number;
  activeBatches: number;
  completedBatches: number;
  defectivePercentage: number;
  totalDefects: number;
  totalProduced: number;
  averageDefectRate: number;
}

interface BatchStatus {
  status: string;
  count: number;
  percentage: number;
}

interface ProductionMetrics {
  productId: number;
  productName?: string;
  batchCount: number;
  totalProduced: number;
  totalDefects: number;
  defectRate: number;
}

@Component({
  selector: 'app-batches-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './batches-analytics.component.html',
  styleUrl: './batches-analytics.component.scss'
})
export class BatchesAnalyticsComponent implements OnInit, OnDestroy {
  batches = signal<Batch[]>([]);
  metrics = signal<BatchMetrics>({
    totalBatches: 0,
    activeBatches: 0,
    completedBatches: 0,
    defectivePercentage: 0,
    totalDefects: 0,
    totalProduced: 0,
    averageDefectRate: 0
  });
  batchStatuses = signal<BatchStatus[]>([]);
  productionMetrics = signal<ProductionMetrics[]>([]);
  loading = signal(false);
  error = signal<string | null>(null);

  private destroy$ = new Subject<void>();

  constructor(private batchesService: BatchesService, private alert: AlertService) { }

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading.set(true);
    this.error.set(null);

    this.batchesService
      .list({}, 1, 999)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          const batchesData = res.data || [];
          this.batches.set(batchesData);
          this.calculateMetrics(batchesData);
          this.calculateBatchStatuses(batchesData);
          this.calculateProductionMetrics(batchesData);
          this.loading.set(false);
        },
        error: (err) => {
          const message = err?.message || 'Error cargando analítica';
          this.error.set(message);
          this.alert.error('Error', message);
          this.loading.set(false);
        }
      });
  }

  private calculateMetrics(batches: Batch[]): void {
    if (!batches || batches.length === 0) {
      this.metrics.set({
        totalBatches: 0,
        activeBatches: 0,
        completedBatches: 0,
        defectivePercentage: 0,
        totalDefects: 0,
        totalProduced: 0,
        averageDefectRate: 0
      });
      return;
    }

    const totalBatches = batches.length;
    const activeBatches = batches.filter(
      b => b.status === 'in_process' || b.status === 'planned'
    ).length;

    const completedBatches = batches.filter(
      b => b.status === 'completed'
    ).length;


    const totalDefects = batches.reduce((sum, b) => sum + (b.defect_quantity ?? 0), 0);
    const totalProduced = batches.reduce((sum, b) => sum + (b.quantity ?? 0), 0);
    const batchesWithDefects = batches.filter(b => (b.defect_quantity ?? 0) > 0).length;
    const defectivePercentage = totalBatches > 0 ? (batchesWithDefects / totalBatches) * 100 : 0;
    const averageDefectRate = totalProduced > 0 ? (totalDefects / totalProduced) * 100 : 0;

    this.metrics.set({
      totalBatches,
      activeBatches,
      completedBatches,
      defectivePercentage: Math.round(defectivePercentage * 100) / 100,
      totalDefects,
      totalProduced,
      averageDefectRate: Math.round(averageDefectRate * 100) / 100
    });
  }

  private calculateBatchStatuses(batches: Batch[]): void {
    const statuses: Record<string, number> = {
      'Activos': batches.filter(
        b => b.status === 'in_process' || b.status === 'planned'
      ).length,
      'Completados': batches.filter(
        b => b.status === 'completed'
      ).length,
      'Con Defectos': batches.filter(
        b => (b.defect_quantity ?? 0) > 0
      ).length
    };
    
    const total = batches.length;
    const statusArray: BatchStatus[] = Object.entries(statuses).map(([status, count]) => ({
      status,
      count,
      percentage: total > 0 ? Math.round((count / total) * 100) : 0
    }));

    this.batchStatuses.set(statusArray);
  }

  private calculateProductionMetrics(batches: Batch[]): void {
    const metricsMap = new Map<number, ProductionMetrics>();

    batches.forEach(batch => {
      const productId = batch.product_id ?? 0;
      if (!metricsMap.has(productId)) {
        metricsMap.set(productId, {
          productId,
          productName: `Producto ${productId}`,
          batchCount: 0,
          totalProduced: 0,
          totalDefects: 0,
          defectRate: 0
        });
      }

      const metric = metricsMap.get(productId)!;
      metric.batchCount++;
      metric.totalProduced += batch.quantity ?? 0;
      metric.totalDefects += batch.defect_quantity ?? 0;
      metric.defectRate = metric.totalProduced > 0 ? (metric.totalDefects / metric.totalProduced) * 100 : 0;
    });

    const metricsArray = Array.from(metricsMap.values())
      .sort((a, b) => b.totalProduced - a.totalProduced)
      .slice(0, 10); // Top 10 productos

    this.productionMetrics.set(metricsArray);
  }

  getStatusBadgeClass(percentage: number): string {
    if (percentage >= 50) return 'bg-danger';
    if (percentage >= 25) return 'bg-warning';
    return 'bg-success';
  }

  getStatusDotClass(status: string): string {
    switch (status) {
      case 'Activos': return 'bg-info';
      case 'Completados': return 'bg-success';
      case 'Con Defectos': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  getStatusProgressClass(status: string): string {
    switch (status) {
      case 'Activos': return 'bg-info';
      case 'Completados': return 'bg-success';
      case 'Con Defectos': return 'bg-warning';
      default: return 'bg-secondary';
    }
  }

  getDefectRateBadgeClass(rate: number): string {
    if (rate > 10) return 'bg-danger';
    if (rate > 5) return 'bg-warning';
    return 'bg-success';
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
