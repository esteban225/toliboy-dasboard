import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { InventoryMovementService } from '../../services/inventory-movement.service';
import { InventoryAnalyticsService } from '../../services/inventory-analytics.service';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { Subject } from 'rxjs';

type ProductionLine = 'richard' | 'panaderia' | 'pasteleria';

interface LineExpenseReport {
  line: ProductionLine;
  totalExpense: number;
  totalQuantity: number;
  materials: {
    name: string;
    quantity: number;
    unitCost: number;
    expense: number;
    batchesUsed: string[];
  }[];
}

@Component({
  selector: 'app-inventory-expense-report',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './inventory-expense-report.component.html',
  styleUrls: ['./inventory-expense-report.component.scss']
})
export class InventoryExpenseReportComponent implements OnInit, OnDestroy {
  filterForm: FormGroup;
  reportData: LineExpenseReport[] = [];
  loading = false;
  error: string | null = null;
  totalExpense = 0;
  totalQuantity = 0;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private movementService: InventoryMovementService,
    private analyticsService: InventoryAnalyticsService,
    private materialsService: RawMaterialsService,
    private alertService: AlertService
  ) {
    this.filterForm = this.fb.group({
      production_line: [''],
      start_date: ['', Validators.required],
      end_date: ['', Validators.required]
    });

    // Establecer fechas por defecto (último mes)
    const today = new Date();
    const lastMonth = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);
    this.filterForm.patchValue({
      start_date: this.formatDate(lastMonth),
      end_date: this.formatDate(today)
    });
  }

  ngOnInit(): void {
    this.generateReport();
  }

  generateReport(): void {
    if (this.filterForm.invalid) return;

    this.loading = true;
    this.error = null;

    const startDate = this.filterForm.get('start_date')?.value;
    const endDate = this.filterForm.get('end_date')?.value;
    const productionLine = this.filterForm.get('production_line')?.value;

    // Filtros básicos sin fechas (el backend filtrará por created_at)
    const filters: any = {
      movement_type: 'out'
    };

    if (productionLine) {
      filters.production_line = productionLine;
    }

    // Obtener movimientos y materiales
    Promise.all([
      this.movementService.list(filters, 100, 1).toPromise(),
      this.materialsService.list({}, 100, 1).toPromise()
    ])
      .then(([movementsRes, materialsRes]) => {
        let movements = movementsRes?.data || [];
        const materials = materialsRes?.data || [];

        // Filtrar por rango de fechas en el cliente
        if (startDate && endDate) {
          const start = new Date(startDate);
          const end = new Date(endDate);
          end.setHours(23, 59, 59, 999); // Incluir todo el último día

          movements = movements.filter((m: any) => {
            const createdAt = new Date(m.created_at);
            return createdAt >= start && createdAt <= end;
          });
        }

        const lineExpenses = this.analyticsService.calculateLineExpense(
          movements,
          materials,
          productionLine || undefined
        );

        this.reportData = lineExpenses.map(le => ({
          line: le.line,
          totalExpense: le.totalExpense,
          totalQuantity: le.totalQuantity,
          materials: le.materialBreakdown.map(material => ({
            name: material.materialName,
            quantity: material.quantity,
            unitCost: material.unitCost,
            expense: material.expense,
            batchesUsed: material.batchesUsed
          }))
        }));

        this.totalExpense = this.reportData.reduce((sum, r) => sum + r.totalExpense, 0);
        this.totalQuantity = this.reportData.reduce((sum, r) => sum + r.totalQuantity, 0);

        this.loading = false;
      })
      .catch(err => {
        this.error = err?.message || 'Error al generar reporte';
        this.loading = false;
      });
  }

  getLineName(line: ProductionLine): string {
    const names: Record<ProductionLine, string> = {
      richard: 'Línea Richard',
      panaderia: 'Línea Panadería',
      pasteleria: 'Línea Pastelería'
    };
    return names[line] || line;
  }

  getLineColor(line: ProductionLine): string {
    const colors: Record<ProductionLine, string> = {
      richard: 'bg-primary',
      panaderia: 'bg-success',
      pasteleria: 'bg-warning'
    };
    return colors[line] || 'bg-secondary';
  }

  hasAnyBatches(lineReport: LineExpenseReport): boolean {
    return lineReport.materials.some(m => m.batchesUsed.length > 0);
  }

  getAllBatches(lineReport: LineExpenseReport): string[] {
    const batches = new Set<string>();
    lineReport.materials.forEach(m => {
      m.batchesUsed.forEach(b => batches.add(b));
    });
    return Array.from(batches);
  }

  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
