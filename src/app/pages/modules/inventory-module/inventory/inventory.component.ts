import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RawMaterialsService } from '../services/raw-materials.service';
import { InventoryMovementService } from '../services/inventory-movement.service';
import { forkJoin, of, Subject } from 'rxjs';
import { catchError, debounceTime, distinctUntilChanged, finalize, switchMap, takeUntil, tap } from 'rxjs/operators';
import { NotificationGroup, NotificationItem, NotificationService } from 'src/app/core/services/notification.service';
import { FormsModule } from '@angular/forms';
import { ProductsService } from '../../product-module/services/products.service';

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

interface NotificationDetail {
  label: string;
  value: string;
}

interface NotificationDisplay {
  notification: NotificationItem;
  summary: string;
  details: NotificationDetail[];
}

interface DailyMessage {
  title: string;
  message: string;
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
  imports: [CommonModule, FormsModule],
  templateUrl: './inventory.component.html',
  styleUrl: './inventory.component.scss'
})
export class InventoryComponent implements OnInit, OnDestroy {
  loading = true;
  error: string | null = null;
  notificationLoading = false;
  notificationError: string | null = null;

  searchSubject = new Subject<string>();
  // Estadísticas principales
  statsCards: StatCard[] = [];

  // Datos para gráficos/estadísticas
  movementsByType: MovementsByType = { in: 0, out: 0, adjustment: 0 };
  recentMovements: any[] = [];
  lowStockProducts: any[] = [];
  topMovedProducts: any[] = [];
  movementSummary: MovementSummaryItem[] = [];
  notifications: NotificationItem[] = [];
  notificationGroups: NotificationGroup[] = [];
  notificationDisplayList: NotificationDisplay[] = [];
  dailyMessages: DailyMessage[] = [];

  filters = {
    code: ''
  }

  products: any[] = [];

  private destroy$ = new Subject<void>();
  private deletingNotifications = new Set<string | number>();

  constructor(
    private rawMaterialsService: RawMaterialsService,
    private inventoryMovementService: InventoryMovementService,
    private notificationService: NotificationService,
    private productsService: ProductsService
  ) {

    this.searchSubject.pipe(
      debounceTime(5000),            // ← espera 600ms sin escribir
      distinctUntilChanged(),       // ← evita repetir búsquedas iguales
      switchMap(code => {
        code = code.trim().toLowerCase();

        if (!code) {
          return this.productsService.list({});
        }

        this.loading = true;
        this.error = null;

        return this.productsService.list({ code }).pipe(
          catchError(err => {
            this.error = 'Error filtrando productos';
            return of({ data: [], meta: null });
          }),
          finalize(() => this.loading = false)
        );
      })
    ).subscribe(response => {
      this.products = response.data || [];
      const filteredData = { rawMaterials: response, movements: { data: [] } };
      this.processStatistics(filteredData);
    });
  }

  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  ngOnInit(): void {
    this.loadStatistics();
    this.subscribeToNotifications();
    this.loadNotifications();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private loadStatistics(): void {
    this.loading = true;
    this.error = null;

    // Cargar datos en paralelo
    forkJoin({
      rawMaterials: this.rawMaterialsService.list({}).pipe(
        catchError(err => {
          console.error('Error loading raw materials:', err);
          return of({ data: [], meta: null });
        }),
        tap(() => console.log('Raw materials loaded'))
      ),
      movements: this.inventoryMovementService.list({}).pipe(
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
    this.updateStatsCards(totalProducts, activeProducts, lowStockCount, totalMovements);
    this.dailyMessages = this.buildDailyMessages(lowStockProducts, totalMovements, movementsByType);
  }

  private subscribeToNotifications(): void {
    this.notificationService
      .getNotifications()
      .pipe(takeUntil(this.destroy$))
      .subscribe((groups) => {
        this.notificationGroups = groups;
        this.notifications = groups.reduce<NotificationItem[]>((acc, group) => acc.concat(group.items), []);
        this.notificationDisplayList = this.notifications.map((n) => this.buildNotificationDisplay(n));
      });
  }

  private loadNotifications(): void {
    this.notificationLoading = true;
    this.notificationError = null;

    this.notificationService
      .fetchNotificationsFromApi()
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.notificationError = null;
          this.notificationLoading = false;
        },
        error: (err) => {
          console.error('Error fetching notifications:', err);
          this.notificationError = err?.error?.message || err?.message || 'Error cargando notificaciones';
          this.notificationLoading = false;
        }
      });
  }

  private updateStatsCards(
    totalProducts: number,
    activeProducts: number,
    lowStockCount: number,
    totalMovements: number
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
    this.loadNotifications();
  }

  refreshNotifications(): void {
    this.loadNotifications();
  }

  trackNotification(index: number, item: NotificationDisplay): string | number {
    return item.notification.id;
  }

  mapNotificationBadge(type: NotificationItem['type']): string {
    switch (type) {
      case 'success':
        return 'bg-success text-white';
      case 'warning':
        return 'bg-warning text-dark';
      case 'danger':
        return 'bg-danger text-white';
      case 'primary':
        return 'bg-primary text-white';
      default:
        return 'bg-info text-white';
    }
  }

  formatNotificationTimestamp(timestamp?: string): string {
    if (!timestamp) {
      return '';
    }
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return timestamp;
    }
    return date.toLocaleString('es-ES', { dateStyle: 'short', timeStyle: 'short' });
  }

  deleteNotification(item: NotificationDisplay): void {
    const notificationId = item.notification.id;
    if (!notificationId || this.deletingNotifications.has(notificationId)) {
      return;
    }

    this.deletingNotifications.add(notificationId);
    this.notificationService.deleteNotificationOnServer(notificationId)
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => this.deletingNotifications.delete(notificationId))
      )
      .subscribe((deleted) => {
        if (!deleted) {
          console.warn('[Inventory] No se pudo eliminar la notificación desde el servidor');
        }
      });
  }

  isNotificationDeleting(item: NotificationDisplay): boolean {
    return this.deletingNotifications.has(item.notification.id);
  }

  private buildNotificationDisplay(notification: NotificationItem): NotificationDisplay {
    const message = notification.message || '';
    const parts = message.split('|').map(part => part.trim()).filter(Boolean);
    let summary = '';
    const details: NotificationDetail[] = [];

    parts.forEach((part, index) => {
      const separatorIndex = part.indexOf(':');
      if (index === 0 && separatorIndex === -1) {
        summary = part;
      } else if (separatorIndex > -1) {
        const label = this.capitalizeLabel(part.substring(0, separatorIndex).trim());
        const value = part.substring(separatorIndex + 1).trim();
        details.push({ label, value });
      } else if (!summary) {
        summary = part;
      } else {
        details.push({ label: 'Detalle', value: part });
      }
    });

    if (!summary) {
      summary = message;
    }

    return { notification, summary, details };
  }

  private capitalizeLabel(label: string): string {
    if (!label) {
      return label;
    }
    return label.charAt(0).toUpperCase() + label.slice(1);
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

  private buildDailyMessages(
    lowStockProducts: any[],
    totalMovements: number,
    movementsByType: MovementsByType
  ): DailyMessage[] {
    const messages: DailyMessage[] = [];

    if (lowStockProducts.length > 0) {
      const highlights = lowStockProducts
        .slice(0, 3)
        .map((product: any) => product?.name || product?.code || 'Producto');
      const highlightedText = highlights.length ? ` (${highlights.join(', ')})` : '';
      messages.push({
        title: 'Revisar stock bajo',
        message: `${lowStockProducts.length} producto(s) requieren reposicion${highlightedText}.`
      });
    } else {
      messages.push({
        title: 'Stock estable',
        message: 'No hay productos en niveles criticos. Mantener monitoreo regular.'
      });
    }

    if (totalMovements > 0) {
      messages.push({
        title: 'Actividad del inventario',
        message: `Se registraron ${totalMovements} movimientos (${movementsByType.in} entradas y ${movementsByType.out} salidas).`
      });
    } else {
      messages.push({
        title: 'Sin movimientos recientes',
        message: 'Todavia no hay transacciones registradas para el periodo consultado.'
      });
    }

    return messages;
  }
}
