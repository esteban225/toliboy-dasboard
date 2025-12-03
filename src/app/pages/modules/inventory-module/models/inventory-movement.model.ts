/**
 * Modelo para movimientos de inventario con soporte a lotes
 */

export type MovementType = 'in' | 'out';
export type ProductionLine = 'richard' | 'panaderia' | 'pasteleria';

export interface InventoryBatch {
  id?: number;
  movement_id?: number;
  raw_material_id?: number;
  raw_material_name?: string;
  batch_code?: string;
  quantity?: number;
  expiry_date?: string; // Fecha de vencimiento del lote
  created_at?: string;
  notes?: string;
}

export interface InventoryMovement {
  id?: number;
  movement_type?: MovementType; // 'in' = entrada, 'out' = salida
  raw_material_id?: number;
  raw_material_name?: string;
  quantity?: number;
  date?: string;
  
  // Para movimientos de ENTRADA
  batch_code?: string;
  expiry_date?: string;
  supplier?: string;
  
  // Para movimientos de SALIDA
  production_line?: ProductionLine; // 'richard', 'panaderia', 'pasteleria'
  line_batch?: string; // Referencia del lote que se usó en la línea
  destination_batch?: string; // Batch del que salió en caso de mezcla
  
  // Auditoría
  created_by?: number | string;
  created_at?: string;
  updated_at?: string;
  notes?: string;

  // Relaciones cargadas
  batches?: InventoryBatch[]; // Lotes asociados a este movimiento
}

export interface InventoryMovementReport {
  period?: {
    start: string;
    end: string;
  };
  summary?: {
    totalEntries: number;
    totalExits: number;
    totalValueIn: number;
    totalValueOut: number;
    netChange: number;
  };
  entries?: InventoryMovement[];
  exits?: InventoryMovement[];
  expiringBatches?: InventoryBatch[];
  lineProductionSummary?: {
    line: ProductionLine;
    rawMaterialsUsed: Array<{
      material: string;
      quantity: number;
      totalValue: number;
      batchesUsed: string[];
    }>;
    totalExpense: number;
  }[];
}

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}
