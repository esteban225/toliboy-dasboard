import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, forkJoin, of, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { GlobalComponent } from 'src/app/global-component';
import { Batch } from '../../batches-module/models/batch.model';
import { Product } from '../../product-module/models/product.model';
import { RawMaterial } from '../models/raw-material.model';

/**
 * Interfaz para especificaciones de materias primas en un producto
 * Estructura esperada en el campo 'specifications' del producto:
 * Formato: "raw_material_code:cantidad_por_unidad"
 * Ejemplo: ["RM001:0.5", "RM002:0.25", "RM003:1"]
 */
export interface MaterialSpecification {
  rawMaterialCode: string;
  rawMaterialId?: number;
  rawMaterialName?: string;
  quantityPerUnit: number;
  unitOfMeasure?: string;
  currentStock?: number;
}

/**
 * Interfaz para un lote pendiente de liberación
 */
export interface PendingReleaseBatch {
  batch: Batch;
  product: Product;
  requiredMaterials: MaterialRequirement[];
  totalUnitsToRelease: number;
  canRelease: boolean;
  insufficientMaterials: string[];
  alreadyReleased: boolean;
  releasedQuantity: number;
}

/**
 * Requerimiento de material para un lote
 */
export interface MaterialRequirement {
  rawMaterialId: number;
  rawMaterialCode: string;
  rawMaterialName: string;
  quantityPerUnit: number;
  totalQuantityNeeded: number;
  currentStock: number;
  unitOfMeasure: string;
  hasSufficientStock: boolean;
  stockDeficit: number;
}

/**
 * Resultado de la liberación de materiales
 */
export interface ReleaseResult {
  success: boolean;
  batchId: number;
  batchCode: string;
  releasedMaterials: {
    rawMaterialId: number;
    rawMaterialName: string;
    quantity: number;
    movementId?: number;
  }[];
  errors: string[];
}

@Injectable({
  providedIn: 'root'
})
export class MaterialReleaseService {
  private batchesUrl = `${GlobalComponent.API_URL}batches`;
  private productsUrl = `${GlobalComponent.API_URL}products`;
  private rawMaterialsUrl = `${GlobalComponent.API_URL}raw-materials`;
  private movementsUrl = `${GlobalComponent.API_URL}inventory-movements`;

  constructor(private http: HttpClient) {}

  private getHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    const headersObj: any = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headersObj['Authorization'] = `Bearer ${token}`;
    }
    return new HttpHeaders(headersObj);
  }

  /**
   * Obtiene todos los lotes pendientes de liberación de materias primas
   * (status: planned, in_process) con su información de producto y materiales requeridos
   */
  getPendingReleaseBatches(): Observable<PendingReleaseBatch[]> {
    return forkJoin({
      batches: this.getAllPendingBatches(),
      products: this.getAllProducts(),
      rawMaterials: this.getAllRawMaterials(),
      movements: this.getAllMovements()
    }).pipe(
      map(({ batches, products, rawMaterials, movements }) => {
        console.log('[MaterialRelease] Datos cargados:', {
          batches: batches.length,
          products: products.length,
          rawMaterials: rawMaterials.length,
          movements: movements.length
        });

        const productMap = new Map(products.map(p => [p.id, p]));
        
        // Crear múltiples mapas para buscar materias primas
        const rawMaterialByCode = new Map(rawMaterials.map(rm => [rm.code?.toLowerCase(), rm]));
        const rawMaterialByName = new Map(rawMaterials.map(rm => [this.normalizeText(rm.name || ''), rm]));
        const rawMaterialById = new Map(rawMaterials.map(rm => [rm.id, rm]));
        
        console.log('[MaterialRelease] Materias primas disponibles:', 
          rawMaterials.map(rm => ({ id: rm.id, name: rm.name, code: rm.code }))
        );
        
        // Agrupar movimientos por batch_id
        const movementsByBatch = new Map<number, any[]>();
        movements.forEach(m => {
          if (m.batch_id) {
            const existing = movementsByBatch.get(m.batch_id) || [];
            existing.push(m);
            movementsByBatch.set(m.batch_id, existing);
          }
        });

        const pendingBatches = batches
          .filter(batch => {
            const isValid = batch.product_id && 
                           batch.status !== 'cancelled' && 
                           batch.status !== 'completed' && 
                           batch.status !== 'delivered';
            console.log('[MaterialRelease] Lote:', batch.code, 'Status:', batch.status, 'Válido:', isValid);
            return isValid;
          })
          .map(batch => {
            const product = productMap.get(batch.product_id!);
            if (!product) {
              console.log('[MaterialRelease] Producto no encontrado para lote:', batch.code);
              return null;
            }

            console.log('[MaterialRelease] Producto:', product.name, 'Especificaciones:', product.specifications);

            // Parsear especificaciones del producto
            const materialSpecs = this.parseSpecifications(product.specifications || []);
            console.log('[MaterialRelease] Especificaciones parseadas:', materialSpecs);
            
            // Verificar si ya se han liberado materiales para este lote
            const batchMovements = movementsByBatch.get(batch.id!) || [];
            const outMovements = batchMovements.filter(m => m.movement_type === 'out');
            const alreadyReleased = outMovements.length > 0;
            const releasedQuantity = outMovements.reduce((sum, m) => sum + (parseFloat(m.quantity) || 0), 0);

            // Calcular requerimientos de materiales
            const unitsToRelease = batch.quantity || 0;
            const insufficientMaterials: string[] = [];
            
            const requiredMaterials: MaterialRequirement[] = materialSpecs.map(spec => {
              // Buscar materia prima por código o por nombre
              let rawMaterial = rawMaterialByCode.get(spec.rawMaterialCode.toLowerCase());
              if (!rawMaterial) {
                rawMaterial = rawMaterialByName.get(this.normalizeText(spec.rawMaterialCode));
              }
              
              console.log('[MaterialRelease] Buscando materia prima:', spec.rawMaterialCode, '-> Encontrado:', rawMaterial?.name);

              const totalNeeded = spec.quantityPerUnit * unitsToRelease;
              const currentStock = rawMaterial?.stock || 0;
              const hasSufficient = currentStock >= totalNeeded;
              
              if (!hasSufficient) {
                insufficientMaterials.push(spec.rawMaterialCode);
              }

              return {
                rawMaterialId: rawMaterial?.id || 0,
                rawMaterialCode: rawMaterial?.code || spec.rawMaterialCode,
                rawMaterialName: rawMaterial?.name || spec.rawMaterialCode,
                quantityPerUnit: spec.quantityPerUnit,
                totalQuantityNeeded: totalNeeded,
                currentStock: currentStock,
                unitOfMeasure: rawMaterial?.unit_of_measure || 'unidad',
                hasSufficientStock: hasSufficient,
                stockDeficit: hasSufficient ? 0 : totalNeeded - currentStock
              };
            });

            const canRelease = !alreadyReleased && 
                             requiredMaterials.length > 0 && 
                             requiredMaterials.every(m => m.hasSufficientStock && m.rawMaterialId > 0);

            console.log('[MaterialRelease] Lote:', batch.code, 
              'Materiales:', requiredMaterials.length, 
              'PuedeLiberarse:', canRelease,
              'YaLiberado:', alreadyReleased
            );

            return {
              batch,
              product,
              requiredMaterials,
              totalUnitsToRelease: unitsToRelease,
              canRelease,
              insufficientMaterials,
              alreadyReleased,
              releasedQuantity
            } as PendingReleaseBatch;
          })
          .filter((item): item is PendingReleaseBatch => item !== null);

        console.log('[MaterialRelease] Total lotes pendientes:', pendingBatches.length);
        return pendingBatches;
      }),
      catchError(err => {
        console.error('[MaterialReleaseService] Error getting pending batches:', err);
        return of([]);
      })
    );
  }

  /**
   * Normaliza texto para búsqueda (quita acentos, minúsculas, espacios extra)
   */
  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }

  /**
   * Libera las materias primas para un lote específico
   * Crea movimientos de salida para cada materia prima requerida
   */
  releaseMaterialsForBatch(pendingBatch: PendingReleaseBatch, productionLine: string = 'principal', notes?: string): Observable<ReleaseResult> {
    if (!pendingBatch.canRelease) {
      return throwError(() => ({
        success: false,
        batchId: pendingBatch.batch.id || 0,
        batchCode: pendingBatch.batch.code || '',
        releasedMaterials: [],
        errors: pendingBatch.alreadyReleased 
          ? ['Ya se han liberado materiales para este lote']
          : ['No se puede liberar: materiales insuficientes o no configurados']
      }));
    }

    const releaseObservables = pendingBatch.requiredMaterials.map(material => {
      const payload = {
        raw_material_id: material.rawMaterialId,
        batch_id: pendingBatch.batch.id,
        movement_type: 'out',
        production_line: productionLine,
        quantity: material.totalQuantityNeeded,
        unit_cost: 0,
        notes: this.buildReleaseNotes(pendingBatch, material, notes)
      };

      return this.http.post<any>(this.movementsUrl, payload, { headers: this.getHeaders() }).pipe(
        map(response => ({
          rawMaterialId: material.rawMaterialId,
          rawMaterialName: material.rawMaterialName,
          quantity: material.totalQuantityNeeded,
          movementId: response?.id || response?.data?.id,
          success: true,
          error: null as string | null
        })),
        catchError(err => of({
          rawMaterialId: material.rawMaterialId,
          rawMaterialName: material.rawMaterialName,
          quantity: material.totalQuantityNeeded,
          movementId: undefined as number | undefined,
          success: false,
          error: err?.message || 'Error al crear movimiento'
        }))
      );
    });

    return forkJoin(releaseObservables).pipe(
      map(results => {
        const successfulReleases = results.filter(r => r.success);
        const errors = results.filter(r => !r.success).map(r => `${r.rawMaterialName}: ${r.error}`);

        return {
          success: errors.length === 0,
          batchId: pendingBatch.batch.id || 0,
          batchCode: pendingBatch.batch.code || '',
          releasedMaterials: successfulReleases.map(r => ({
            rawMaterialId: r.rawMaterialId,
            rawMaterialName: r.rawMaterialName,
            quantity: r.quantity,
            movementId: r.movementId
          })),
          errors
        } as ReleaseResult;
      })
    );
  }

  /**
   * Parsea las especificaciones del producto para extraer materiales y cantidades
   * Formato esperado: "CODIGO_MATERIA:cantidad" o "nombre_materia:cantidad"
   */
  private parseSpecifications(specifications: string[]): MaterialSpecification[] {
    if (!specifications || specifications.length === 0) {
      return [];
    }

    return specifications
      .map(spec => {
        const trimmed = spec.trim();
        // Buscar el formato "codigo:cantidad" o "nombre:cantidad"
        const colonIndex = trimmed.lastIndexOf(':');
        
        if (colonIndex > 0) {
          const materialPart = trimmed.substring(0, colonIndex).trim();
          const quantityPart = trimmed.substring(colonIndex + 1).trim();
          const quantity = parseFloat(quantityPart);
          
          if (!isNaN(quantity) && quantity > 0) {
            return {
              rawMaterialCode: materialPart,
              quantityPerUnit: quantity
            } as MaterialSpecification;
          }
        }
        
        // Si no tiene formato válido, intentar usar todo como código con cantidad 1
        return {
          rawMaterialCode: trimmed,
          quantityPerUnit: 1
        } as MaterialSpecification;
      })
      .filter(spec => spec.rawMaterialCode.length > 0);
  }

  /**
   * Construye las notas para el movimiento de liberación
   */
  private buildReleaseNotes(pendingBatch: PendingReleaseBatch, material: MaterialRequirement, additionalNotes?: string): string {
    const parts = [
      `Lote: ${pendingBatch.batch.code || pendingBatch.batch.id}`,
      `Producto: ${pendingBatch.product.name || pendingBatch.product.code}`,
      `Unidades: ${pendingBatch.totalUnitsToRelease}`,
      `Material: ${material.rawMaterialName}`,
      `Cantidad/unidad: ${material.quantityPerUnit}`
    ];
    
    if (additionalNotes) {
      parts.push(`Notas: ${additionalNotes}`);
    }
    
    return parts.join(' | ');
  }

  /**
   * Obtiene todos los lotes pendientes (planned, in_process)
   */
  private getAllPendingBatches(): Observable<Batch[]> {
    let params = new HttpParams()
      .set('per_page', '500')
      .set('page', '1');

    return this.http.get<any>(this.batchesUrl, { headers: this.getHeaders(), params }).pipe(
      map(res => res?.data || res || []),
      catchError(err => {
        console.error('[MaterialReleaseService] Error fetching batches:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtiene todos los productos
   */
  private getAllProducts(): Observable<Product[]> {
    let params = new HttpParams()
      .set('per_page', '500')
      .set('page', '1');

    return this.http.get<any>(this.productsUrl, { headers: this.getHeaders(), params }).pipe(
      map(res => res?.data || res || []),
      catchError(err => {
        console.error('[MaterialReleaseService] Error fetching products:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtiene todas las materias primas
   */
  private getAllRawMaterials(): Observable<RawMaterial[]> {
    let params = new HttpParams()
      .set('per_page', '500')
      .set('page', '1');

    return this.http.get<any>(this.rawMaterialsUrl, { headers: this.getHeaders(), params }).pipe(
      map(res => res?.data || res || []),
      catchError(err => {
        console.error('[MaterialReleaseService] Error fetching raw materials:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtiene todos los movimientos de inventario
   */
  private getAllMovements(): Observable<any[]> {
    let params = new HttpParams()
      .set('per_page', String(500))
      .set('page', String(1));

    return this.http.get<any>(this.movementsUrl, { headers: this.getHeaders(), params }).pipe(
      map(res => res?.data || res || []),
      catchError(err => {
        console.error('[MaterialReleaseService] Error fetching movements:', err);
        return of([]);
      })
    );
  }

  /**
   * Obtiene las líneas de producción disponibles
   */
  getProductionLines(): string[] {
    return ['richard', 'panaderia', 'pasteleria', 'principal', 'empaque'];
  }
}
