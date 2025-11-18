import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RawMaterialsService } from '../services/raw-materials.service';
import { InventoryMovementService } from '../services/inventory-movement.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

interface StatCard {
  title: string;
  value: string | number;
  icon: string;
  color: string;
  subtitle?: string;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

interface MovementsByType {
  in: number;
  out: number;
  adjustment: number;
}

type MovementTypeKey = keyof MovementsByType;

interface MovementSummaryItem {
  key: MovementTypeKey;
  label: string;
  icon: string;
  value: number;
  percentage: number;
  textClass: string;
  progressClass: string;
}

interface MovementUiMeta {
  label: string;
  badgeClass: string;
  icon: string;
  quantityClass: string;
  progressClass: string;
  prefix: string;
}

const MOVEMENT_TYPE_META: Record<MovementTypeKey, MovementUiMeta> = {
  in: {
    label: 'Entrada',
    badgeClass: 'bg-success text-white',
    icon: 'bi-arrow-down-circle-fill',
    quantityClass: 'text-success',
    progressClass: 'bg-success',
    prefix: '+'
  },
  out: {
    label: 'Salida',
    badgeClass: 'bg-danger text-white',
    icon: 'bi-arrow-up-circle-fill',
    quantityClass: 'text-danger',
    progressClass: 'bg-danger',
    prefix: '-'
  },
  adjustment: {
    label: 'Ajuste',
    badgeClass: 'bg-warning text-dark',
    icon: 'bi-gear-fill',
    quantityClass: 'text-warning',
    progressClass: 'bg-warning',
    prefix: '±'
  }
};

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit {
  loading = true;
  error: string | null = null;
  
  // Estadísticas principales
  statsCards: StatCard[] = [];
  
  // Datos para gráficos/estadísticas
  movementsByType: MovementsByType = { in: 0, out: 0, adjustment: 0 };
  recentMovements: any[] = [];
  lowStockProducts: any[] = [];
  topMovedProducts: any[] = [];
  movementSummary: MovementSummaryItem[] = [];

  constructor(
    private rawMaterialsService: RawMaterialsService,
    private inventoryMovementService: InventoryMovementService
  ) {}

  ngOnInit(): void {
    this.loadStatistics();
  }

  private loadStatistics(): void {
    this.loading = true;
    this.error = null;

    // Cargar datos en paralelo
    forkJoin({
      rawMaterials: this.rawMaterialsService.list({}, 1, 1000).pipe(
        catchError(err => {
          console.error('Error loading raw materials:', err);
          return of({ data: [], meta: null });
        })
      ),
      movements: this.inventoryMovementService.list({}, 100, 1).pipe(
        catchError(err => {
          console.error('Error loading movements:', err);
          return of({ data: [], success: false });
        })
      )
    }).subscribe({
      next: (data) => {
        this.processStatistics(data);
        this.loading = false;
      },
      error: (err) => {
        console.error('Error loading statistics:', err);
        this.error = 'Error cargando estadísticas del inventario';
        this.loading = false;
      }
    });
  }

  private processStatistics(data: any): void {
    const rawMaterials = data.rawMaterials?.data || [];
    const movements = data.movements?.data || [];

    // Procesar materias primas
    const totalProducts = rawMaterials.length;
    const activeProducts = rawMaterials.filter((p: any) => p.is_active !== false).length;
    
    const lowStockProducts = rawMaterials
      .filter((product: any) => {
        const currentStock = Number(product.stock) || 0;
        const minStock = Number(product.min_stock) || 0;
        return minStock > 0 && currentStock <= minStock;
      })
      .map((product: any) => ({
        ...product,
        current_stock: Number(product.stock) || 0,
        min_stock: Number(product.min_stock) || 0,
        isLowStock: true
      }));

    const lowStockCount = lowStockProducts.length;

    // Procesar movimientos
    const totalMovements = movements.length;
    const movementsByType: MovementsByType = { in: 0, out: 0, adjustment: 0 };
    
    movements.forEach((m: any) => {
      const type = (m?.type || m?.movement_type || '').toLowerCase();
      if (type === 'in') movementsByType.in++;
      else if (type === 'out') movementsByType.out++;
      else if (type === 'adjustment') movementsByType.adjustment++;
    });

    // Calcular valor total del inventario
    const totalInventoryValue = rawMaterials.reduce((sum: number, product: any) => {
      const stock = Number(product.stock) || 0;
      const price = Number(product.unit_cost) || Number(product.price) || Number(product.cost) || 0;
      return sum + (stock * price);
    }, 0);

    // Obtener movimientos recientes (últimos 5) con metadata de UI
    this.recentMovements = movements.slice(0, 5).map((movement: any) => this.mapMovementForUi(movement));

    // Asignar productos con bajo stock (máximo 8 para mantener vista limpia)
    this.lowStockProducts = lowStockProducts.slice(0, 8);

    // Actualizar estadísticas
    this.movementsByType = movementsByType;
    this.movementSummary = this.buildMovementSummary(movementsByType);
    this.updateStatsCards(totalProducts, activeProducts, lowStockCount, totalMovements, totalInventoryValue);
  }

  private updateStatsCards(
    totalProducts: number, 
    activeProducts: number, 
    lowStockCount: number, 
    totalMovements: number, 
    totalInventoryValue: number
  ): void {
    this.statsCards = [
      {
        title: 'Total Productos',
        value: totalProducts,
        icon: 'bi-box-seam',
        color: 'primary',
        subtitle: `${activeProducts} activos`
      },
      {
        title: 'Valor Inventario',
        value: `$${totalInventoryValue.toLocaleString('es-CO', { minimumFractionDigits: 2 })}`,
        icon: 'bi-currency-dollar',
        color: 'success',
        subtitle: 'Valor total estimado'
      },
      {
        title: 'Bajo Stock',
        value: lowStockCount,
        icon: 'bi-exclamation-triangle',
        color: lowStockCount > 0 ? 'warning' : 'success',
        subtitle: 'Productos con stock mínimo'
      },
      {
        title: 'Movimientos',
        value: totalMovements,
        icon: 'bi-arrow-left-right',
        color: 'info',
        subtitle: 'Total de transacciones'
      }
    ];
  }

  refresh(): void {
    this.loadStatistics();
  }

  getMovementTypePercentage(type: keyof MovementsByType): number {
    const total = this.movementsByType.in + this.movementsByType.out + this.movementsByType.adjustment;
    if (total === 0) return 0;
    return Math.round((this.movementsByType[type] / total) * 100);
  }

  private buildMovementSummary(movementsByType: MovementsByType): MovementSummaryItem[] {
    const total = this.movementsByTypeTotal(movementsByType);
    if (total === 0) {
      return Object.keys(movementsByType).map((key) => {
        const meta = MOVEMENT_TYPE_META[key as MovementTypeKey];
        return {
          key: key as MovementTypeKey,
          label: meta.label,
          icon: meta.icon,
          value: 0,
          percentage: 0,
          textClass: meta.quantityClass,
          progressClass: meta.progressClass
        };
      });
    }

    return (Object.keys(movementsByType) as MovementTypeKey[]).map((key) => {
      const meta = MOVEMENT_TYPE_META[key];
      return {
        key,
        label: meta.label,
        icon: meta.icon,
        value: movementsByType[key],
        percentage: Math.round((movementsByType[key] / total) * 100),
        textClass: meta.quantityClass,
        progressClass: meta.progressClass
      };
    });
  }

  private movementsByTypeTotal(movementsByType: MovementsByType): number {
    return movementsByType.in + movementsByType.out + movementsByType.adjustment;
  }

  private mapMovementForUi(movement: any) {
    const rawType = (movement?.type || movement?.movement_type || '').toLowerCase() as MovementTypeKey;
    const meta = MOVEMENT_TYPE_META[rawType] || {
      label: 'N/D',
      badgeClass: 'bg-secondary text-white',
      icon: 'bi-question-circle',
      quantityClass: 'text-muted',
      prefix: ''
    };

    return {
      ...movement,
      uiType: meta.label,
      uiBadgeClass: meta.badgeClass,
      uiIcon: meta.icon,
      uiQuantityClass: meta.quantityClass,
      uiQuantityPrefix: meta.prefix
    };
  }
}
