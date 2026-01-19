# Guía: Sistema de Movimientos de Inventario con Lotes y Egresos

## 📋 Resumen de la Solución

Se ha implementado un sistema profesional de gestión de movimientos de inventario que permite:

1. **Entrada de Materia Prima (Inbound)**
   - Registrar lotes con fecha de vencimiento
   - Código de lote único
   - Cantidad y proveedor
   - Seguimiento de stock por lote

2. **Salida de Materia Prima (Outbound)**
   - Asignación a línea de producción (Richard, Panadería, Pastelería)
   - Registro de lote origen y destino
   - Cálculo automático de egresos por línea

3. **Reportes y Análisis**
   - Reporte de egresos por línea de producción
   - Desglose de materiales por línea
   - Costos totales de producción
   - Trazabilidad de lotes

---

## 🏗️ Estructura de Archivos Creados/Modificados

### Modelos
- **`inventory-movement.model.ts`** ✅ ACTUALIZADO
  - Tipos: `MovementType`, `ProductionLine`
  - Interfaces: `InventoryBatch`, `InventoryMovement`, `InventoryMovementReport`

- **`raw-material.model.ts`** ✅ ACTUALIZADO
  - Agregado campo: `cost_per_unit` para cálculos de egreso

### Servicios
- **`inventory-movement.service.ts`** ✅ ACTUALIZADO
  - Nuevos métodos: `createEntry()`, `createExit()`, `getReport()`, `getBatchesByMaterial()`
  - Métodos de análisis: `getLineExpense()`, `getLineHistory()`, `getExpiringBatches()`

- **`inventory-analytics.service.ts`** ✅ NUEVO
  - Servicio de cálculos y análisis de datos
  - Métodos principales:
    - `calculateLineExpense()` - Calcula egreso por línea
    - `getMaterialBreakdown()` - Desglose de materiales
    - `getExpiringBatches()` - Detecta lotes por vencer
    - `getBatchHistory()` - Historial de lotes
    - `generateLineConsumptionReport()` - Reporte de consumo

### Componentes
- **`inventory-expense-report.component.ts`** ✅ NUEVO
  - Componente standalone para visualizar egresos por línea
  - Filtros por fecha y línea de producción
  - Tabla de materiales con costos
  - Información de lotes utilizados

---

## 🔄 Flujo de Uso

### 1. CREAR ENTRADA (Inbound)

```typescript
// En tu componente
this.movementService.createEntry({
  raw_material_id: 5,
  quantity: 100,
  batch_code: 'HARINA-20251203-001',
  expiry_date: '2026-03-03',
  supplier: 'Molino A',
  notes: 'Llegó en buen estado'
}).subscribe(
  response => {
    // Entrada registrada exitosamente
    // Stock aumenta en 100 para el material 5
  }
);
```

**Lo que sucede internamente:**
- Se crea un `InventoryMovement` con `movement_type = 'in'`
- Se registra el lote `HARINA-20251203-001` con fecha de vencimiento
- El sistema actualiza el stock disponible

---

### 2. CREAR SALIDA (Outbound)

```typescript
// Salida a línea de Panadería usando lote específico
this.movementService.createExit({
  raw_material_id: 5,
  quantity: 25,
  production_line: 'panaderia',
  destination_batch: 'HARINA-20251203-001', // Especificar lote
  line_batch: 'LOTE-PANADERIA-20251203', // Referencia interna
  notes: 'Para pan blanco'
}).subscribe(
  response => {
    // Salida registrada
    // Stock se reduce en 25
    // Egreso se contabiliza en la línea Panadería
  }
);
```

**Lo que sucede internamente:**
- Se crea un `InventoryMovement` con `movement_type = 'out'`
- Se desglosa el consumo por material
- Se vincula con la línea de producción (Richard, Panadería, Pastelería)
- Se registra el lote utilizado para trazabilidad

---

### 3. GENERAR REPORTE DE EGRESOS

```typescript
// En el componente de reporte
this.movementService.getReport({
  start_date: '2025-12-01',
  end_date: '2025-12-31',
  production_line: 'panaderia'
}).subscribe(
  reportData => {
    // reportData contiene:
    // - summary: totales de entrada/salida
    // - entries: movimientos de entrada
    // - exits: movimientos de salida
    // - lineProductionSummary: desglose por línea
    // - expiringBatches: lotes próximos a vencer
  }
);
```

---

## 📊 Ejemplo de Reporte de Egresos

```json
{
  "lineProductionSummary": [
    {
      "line": "panaderia",
      "rawMaterialsUsed": [
        {
          "material": "Harina blanca",
          "quantity": 150,
          "totalValue": 450.00,
          "batchesUsed": ["HARINA-20251203-001", "HARINA-20251204-001"]
        },
        {
          "material": "Sal",
          "quantity": 5,
          "totalValue": 15.00,
          "batchesUsed": ["SAL-20251201-001"]
        }
      ],
      "totalExpense": 465.00
    },
    {
      "line": "pasteleria",
      "rawMaterialsUsed": [
        {
          "material": "Harina blanca",
          "quantity": 200,
          "totalValue": 600.00,
          "batchesUsed": ["HARINA-20251205-001"]
        },
        {
          "material": "Azúcar",
          "quantity": 100,
          "totalValue": 50.00,
          "batchesUsed": ["AZUCAR-20251203-001"]
        }
      ],
      "totalExpense": 650.00
    }
  ],
  "summary": {
    "totalEntries": 1250,
    "totalExits": 455,
    "totalValueIn": 3750.00,
    "totalValueOut": 1115.00,
    "netChange": 2635.00
  }
}
```

---

## 🎯 Casos de Uso Implementados

### 1. Entrada de Materia Prima
✅ Registrar lote con código, cantidad y fecha de vencimiento
✅ Seguimiento de proveedor
✅ Notas y observaciones

### 2. Salida a Línea de Producción
✅ Asignar materia prima a una línea específica
✅ Registrar lote de origen y destino
✅ Trazabilidad completa

### 3. Cálculo de Egresos
✅ Total gastado por línea de producción
✅ Desglose por material
✅ Costo unitario × cantidad = egreso

### 4. Detección de Vencimiento
✅ Identificar lotes próximos a vencer (configurable, default 30 días)
✅ Alertas de lotes expirados
✅ Historial de uso por lote

### 5. Reporte Integral
✅ Período customizable
✅ Filtros por línea y material
✅ Visualización de tendencias

---

## 🛠️ Integración en tu Componente Actual

### Paso 1: Inyectar servicios
```typescript
constructor(
  private movementService: InventoryMovementService,
  private analyticsService: InventoryAnalyticsService,
  private materialsService: RawMaterialsService
) {}
```

### Paso 2: Usar métodos en formulario de entrada
```typescript
onSubmitEntry() {
  const entry = {
    raw_material_id: this.form.get('material')?.value,
    quantity: this.form.get('quantity')?.value,
    batch_code: this.form.get('batch_code')?.value,
    expiry_date: this.form.get('expiry_date')?.value,
    supplier: this.form.get('supplier')?.value,
    notes: this.form.get('notes')?.value
  };
  
  this.movementService.createEntry(entry).subscribe(
    () => this.alertService.success('Entrada registrada'),
    err => this.alertService.error('Error', err.message)
  );
}
```

### Paso 3: Usar métodos en formulario de salida
```typescript
onSubmitExit() {
  const exit = {
    raw_material_id: this.form.get('material')?.value,
    quantity: this.form.get('quantity')?.value,
    production_line: this.form.get('line')?.value,
    destination_batch: this.form.get('batch')?.value,
    notes: this.form.get('notes')?.value
  };
  
  this.movementService.createExit(exit).subscribe(
    () => this.alertService.success('Salida registrada'),
    err => this.alertService.error('Error', err.message)
  );
}
```

---

## 📈 Backend - Endpoint Esperado

Tu backend debe soportar estos endpoints:

```
POST /api/inventory-movements/entry
{
  "raw_material_id": 5,
  "quantity": 100,
  "batch_code": "LOTE-001",
  "expiry_date": "2026-03-03",
  "supplier": "Proveedor A",
  "notes": "..."
}

POST /api/inventory-movements/exit
{
  "raw_material_id": 5,
  "quantity": 25,
  "production_line": "panaderia",
  "destination_batch": "LOTE-001",
  "line_batch": "PANADERIA-001",
  "notes": "..."
}

GET /api/inventory-movements/report?start_date=2025-12-01&end_date=2025-12-31&production_line=panaderia

GET /api/inventory-movements/material/5/batches

GET /api/inventory-movements/batches/expiring?days=30

GET /api/inventory-movements/line-expense?production_line=panaderia&start_date=2025-12-01&end_date=2025-12-31
```

---

## 🔍 Métodos Disponibles en InventoryAnalyticsService

```typescript
// Calcular egresos por línea
calculateLineExpense(movements, materials, line?)

// Detectar lotes por vencer
getExpiringBatches(batches, daysThreshold = 30)

// Detectar lotes vencidos
getExpiredBatches(batches)

// Stock disponible por lote
calculateStockByBatch(entries, exits, materialId)

// Reporte de consumo por período
generateLineConsumptionReport(movements, materials, startDate, endDate)

// Historial de un lote específico
getBatchHistory(movements, batchCode)
```

---

## ✅ Validaciones Implementadas

- ✅ Cantidad > 0
- ✅ Fecha de vencimiento > fecha actual
- ✅ Línea de producción válida
- ✅ Material debe existir
- ✅ Stock suficiente para salidas
- ✅ Lote debe coincidir

---

## 📝 Resumen

Esta solución proporciona:

1. **Trazabilidad completa** - Saber qué lote se usó cuándo y dónde
2. **Control de vencimiento** - Alertas de lotes por vencer
3. **Análisis de costos** - Saber cuánto gastó cada línea
4. **Reportes precisos** - Información integral por período
5. **Profesionalismo** - Sistema robusto y escalable

¡Tu sistema de inventario ahora es de nivel empresarial! 🚀
