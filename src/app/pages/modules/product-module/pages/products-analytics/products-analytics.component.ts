import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductsService } from '../../services/products.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product } from '../../models/product.model';

@Component({
  selector: 'app-products-analytics',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './products-analytics.component.html',
  styleUrl: './products-analytics.component.scss'
})
export class ProductsAnalyticsComponent implements OnInit, OnDestroy {
  products: Product[] = [];
  loading = true;
  error: string | null = null;

  // Métricas
  totalProducts = 0;
  totalValue = 0;
  inactiveCount = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private productsService: ProductsService,
    private alertService: AlertService
  ) {}

  ngOnInit(): void {
    this.loadAnalytics();
  }

  loadAnalytics(): void {
    this.loading = true;
    this.error = null;

    this.productsService
      .list({}, 1, 99)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products = res.data || [];
          this.calculateMetrics();
          this.loading = false;
        },
        error: (err) => {
          const message = err?.message || 'Ocurrió un error desconocido.';
          this.error = message;
          this.alertService.error('Error cargando analytics', message);
          this.loading = false;
        }
      });
  }

  private calculateMetrics(): void {
    this.totalProducts = this.products.length;
    this.totalValue = this.products.reduce((sum, p) => sum + ((p.unit_price ?? 0)), 0);
    this.inactiveCount = this.products.filter(p => !p.is_active).length;
  }

  getTopProducts(): Product[] {
    return [...this.products]
      .sort((a, b) => ((b.unit_price ?? 0)) - ((a.unit_price ?? 0)))
      .slice(0, 5);
  }

  getProductsByCategory(): any[] {
    const categories: Record<string, number> = {};
    this.products.forEach(p => {
      const cat = p.category || 'Sin categoría';
      categories[cat] = (categories[cat] || 0) + 1;
    });
    return Object.entries(categories)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
