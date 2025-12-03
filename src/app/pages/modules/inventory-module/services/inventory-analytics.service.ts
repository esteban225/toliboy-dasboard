import { Injectable } from '@angular/core';
import { InventoryMovement, InventoryBatch, ProductionLine } from '../models/inventory-movement.model';
import { RawMaterial } from '../models/raw-material.model';

interface LineExpenseDetail {
  line: ProductionLine;
  totalQuantity: number;
  totalExpense: number;
  movements: InventoryMovement[];
  materialBreakdown: {
    materialId: number;
    materialName: string;
    quantity: number;
    unitCost: number;
    expense: number;
    batchesUsed: string[];
  }[];
}

@Injectable({
  providedIn: 'root'
})
export class InventoryAnalyticsService {

  /**
   * Calcula el egreso total de materia prima por línea de producción
   */
  calculateLineExpense(
    movements: InventoryMovement[],
    materials: RawMaterial[],
    line?: ProductionLine
  ): LineExpenseDetail[] {
    const lines: ProductionLine[] = line ? [line] : ['richard', 'panaderia', 'pasteleria'];
    
    return lines.map(currentLine => {
      const lineMovements = movements.filter(
        m => m.movement_type === 'out' && m.production_line === currentLine
      );

      const materialBreakdown = this.getMaterialBreakdown(lineMovements, materials);
      const totalExpense = materialBreakdown.reduce((sum, m) => sum + m.expense, 0);
      const totalQuantity = materialBreakdown.reduce((sum, m) => sum + m.quantity, 0);

      return {
        line: currentLine,
        totalQuantity,
        totalExpense,
        movements: lineMovements,
        materialBreakdown
      };
    });
  }

  /**
   * Obtiene el desglose de materiales por línea
   */
  private getMaterialBreakdown(
    movements: InventoryMovement[],
    materials: RawMaterial[]
  ) {
    const breakdown = new Map<number, {
      materialId: number;
      materialName: string;
      quantity: number;
      unitCost: number;
      batchesUsed: string[];
    }>();

    movements.forEach(movement => {
      if (!movement.raw_material_id) return;

      const material = materials.find(m => m.id === movement.raw_material_id);
      const key = movement.raw_material_id;

      if (breakdown.has(key)) {
        const existing = breakdown.get(key)!;
        existing.quantity += movement.quantity || 0;
        if (movement.line_batch) {
          existing.batchesUsed.push(movement.line_batch);
        }
      } else {
        breakdown.set(key, {
          materialId: movement.raw_material_id,
          materialName: material?.name || 'Desconocido',
          quantity: movement.quantity || 0,
          unitCost: material?.cost_per_unit || 0,
          batchesUsed: movement.line_batch ? [movement.line_batch] : []
        });
      }
    });

    return Array.from(breakdown.values()).map(item => ({
      ...item,
      expense: item.quantity * item.unitCost
    }));
  }

  /**
   * Detecta lotes próximos a vencer
   */
  getExpiringBatches(batches: InventoryBatch[], daysThreshold: number = 30): InventoryBatch[] {
    const now = new Date();
    const thresholdDate = new Date(now.getTime() + daysThreshold * 24 * 60 * 60 * 1000);

    return batches.filter(batch => {
      if (!batch.expiry_date) return false;
      const expiryDate = new Date(batch.expiry_date);
      return expiryDate <= thresholdDate && expiryDate > now;
    });
  }

  /**
   * Detecta lotes vencidos
   */
  getExpiredBatches(batches: InventoryBatch[]): InventoryBatch[] {
    const now = new Date();
    return batches.filter(batch => {
      if (!batch.expiry_date) return false;
      return new Date(batch.expiry_date) <= now;
    });
  }

  /**
   * Calcula el stock disponible considerando entradas y salidas
   */
  calculateStockByBatch(
    entries: InventoryMovement[],
    exits: InventoryMovement[],
    materialId: number
  ): Map<string, { quantity: number; expiry_date?: string }> {
    const stock = new Map<string, { quantity: number; expiry_date?: string }>();

    // Procesar entradas
    entries.forEach(entry => {
      if (entry.raw_material_id !== materialId || !entry.batch_code) return;

      const current = stock.get(entry.batch_code) || { quantity: 0, expiry_date: entry.expiry_date };
      current.quantity += entry.quantity || 0;
      stock.set(entry.batch_code, current);
    });

    // Procesar salidas
    exits.forEach(exit => {
      if (exit.raw_material_id !== materialId) return;

      if (exit.destination_batch) {
        const current = stock.get(exit.destination_batch) || { quantity: 0 };
        current.quantity -= exit.quantity || 0;
        if (current.quantity < 0) current.quantity = 0;
        stock.set(exit.destination_batch, current);
      }
    });

    return stock;
  }

  /**
   * Genera un resumen de consumo por línea en un período
   */
  generateLineConsumptionReport(
    movements: InventoryMovement[],
    materials: RawMaterial[],
    startDate: string,
    endDate: string
  ): {
    period: { start: string; end: string };
    lines: {
      name: ProductionLine;
      totalExpense: number;
      materials: { name: string; quantity: number; cost: number }[];
    }[];
    totalExpense: number;
  } {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const filtered = movements.filter(m => {
      if (m.movement_type !== 'out' || !m.date) return false;
      const date = new Date(m.date);
      return date >= start && date <= end;
    });

    const lineExpenses = this.calculateLineExpense(filtered, materials);

    return {
      period: { start: startDate, end: endDate },
      lines: lineExpenses.map(le => ({
        name: le.line,
        totalExpense: le.totalExpense,
        materials: le.materialBreakdown.map(mb => ({
          name: mb.materialName,
          quantity: mb.quantity,
          cost: mb.expense
        }))
      })),
      totalExpense: lineExpenses.reduce((sum, le) => sum + le.totalExpense, 0)
    };
  }

  /**
   * Obtiene el historial de un lote (entradas y salidas)
   */
  getBatchHistory(
    movements: InventoryMovement[],
    batchCode: string
  ): {
    entries: InventoryMovement[];
    exits: InventoryMovement[];
    currentStock: number;
  } {
    const entries = movements.filter(
      m => m.movement_type === 'in' && m.batch_code === batchCode
    );
    
    const exits = movements.filter(
      m => m.movement_type === 'out' && m.destination_batch === batchCode
    );

    const totalIn = entries.reduce((sum, m) => sum + (m.quantity || 0), 0);
    const totalOut = exits.reduce((sum, m) => sum + (m.quantity || 0), 0);

    return {
      entries,
      exits,
      currentStock: totalIn - totalOut
    };
  }
}
