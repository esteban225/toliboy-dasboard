import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { Subject, Subscription, of } from 'rxjs';
import { takeUntil, finalize, debounceTime, distinctUntilChanged, switchMap, map } from 'rxjs/operators';
import { InventoryMovementService } from '../../services/inventory-movement.service';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { MaterialReleaseService, PendingReleaseBatch, MaterialRequirement } from '../../services/material-release.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { BatchesService } from '../../../batches-module/services/batches.service';
import { Batch } from '../../../batches-module/models/batch.model';

@Component({
  selector: 'app-batch-movement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './batch-movement.component.html',
  styleUrl: './batch-movement.component.scss'
})
export class BatchMovementComponent implements OnInit, OnDestroy {

  // Pending release batches (Release automation)
  pendingReleaseBatches: PendingReleaseBatch[] = [];
  releaseLoading = false;
  releasingMaterial: { batchId: number; materialId: number } | null = null;
  releasedMaterials: Set<string> = new Set();
  fullyReleasedBatches: Set<number> = new Set(); // Lotes con todas sus materias liberadas
  batchesInProcess: Set<number> = new Set(); // Lotes que ya están en proceso o más avanzados
  productionLines = ['richard', 'panaderia', 'pasteleria'];
  loadingBatchLookup = false;
  showBatchSearchModal = false;
  batchSearchLoading = false;
  batchSearchResults: any[] = [];
  batchSearchView: any[] = [];
  batchSearchPage = 1;
  batchSearchPerPage = 10;
  batchSearchMeta: any = null;
  batchSearchSort: 'asc' | 'desc' = 'desc';
  batchSearchFilters = {
    productText: '',
    supplier: '',
    ingressDate: '',
    expiryDate: '',
    status: '',
    freeText: ''
  };
  private allEntryMovements: any[] = [];
  private allEntryMovementsLoaded = false;
  private rawMaterialsMap = new Map<number, any>();
  private rawMaterialsLoaded = false;
  private destroy$ = new Subject<void>();

  // Modal & form
  showModal = false;
  isEditing = false;
  form: FormGroup;
  formError: string | null = null;
  loading = false;
  loadingProductDetails = false;

  // Product search
  productSuggestions: any[] = [];
  private productSearch$ = new Subject<string>();
  private productSearchSub: Subscription | null = null;
  private cachedProducts: any[] = [];
  private productsCached = false;

  constructor(
    private fb: FormBuilder,
    private invService: InventoryMovementService,
    private rawService: RawMaterialsService,
    private materialReleaseService: MaterialReleaseService,
    private batchesService: BatchesService,
    private alert: AlertService
  ) {
    this.form = this.fb.group({
      id: [null],
      type: ['out', [Validators.required]],
      product_id: [null, [Validators.required]],
      product_search: [''],
      batch_id: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_cost: [0, [Validators.required, Validators.min(0)]],
      production_line: [''],
      notes: ['']
    });
  }

  ngOnInit(): void {
    this.loadPendingReleaseBatches();
    this.setupProductSearch();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
    this.productSearchSub?.unsubscribe();
  }

  private setupProductSearch(): void {
    this.productSearchSub = this.productSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const term = (q || '').trim();
          if (!term) return of({ data: [], meta: null });

          if (this.productsCached && this.cachedProducts.length > 0) {
            const filteredData = this.cachedProducts.filter((item: any) => {
              const name = (item?.name || '').toLowerCase();
              const code = (item?.code || '').toLowerCase();
              const searchTerm = term.toLowerCase();
              return name.includes(searchTerm) || code.includes(searchTerm);
            });
            return of({ data: filteredData.slice(0, 10), meta: null });
          }

          return this.rawService.list({}, 1, 200).pipe(
            map((res: any) => {
              const data = res?.data ?? [];
              if (Array.isArray(data) && data.length > 0) {
                this.cachedProducts = data;
                this.productsCached = true;
              }
              const filteredData = data.filter((item: any) => {
                const name = (item?.name || '').toLowerCase();
                const code = (item?.code || '').toLowerCase();
                const searchTerm = term.toLowerCase();
                return name.includes(searchTerm) || code.includes(searchTerm);
              });
              return { data: filteredData.slice(0, 10), meta: null };
            })
          );
        })
      )
      .subscribe({
        next: (res: any) => {
          this.productSuggestions = res?.data ?? [];
        },
        error: () => {
          this.productSuggestions = [];
        }
      });

    // Watch product_search changes
    this.form.get('product_search')?.valueChanges.subscribe(val => {
      if (typeof val === 'string' && val.length > 1) {
        this.productSearch$.next(val);
      } else {
        this.productSuggestions = [];
      }
    });
  }

  selectProduct(p: any): void {
    if (!p) return;
    const productId = p.id ?? p?.product_id ?? null;
    const productName = p.name ?? p.product_name ?? '';
    const productCode = p.code ?? p.product_code ?? '';
    const unitCost = p.unit_cost ?? p.price ?? p.cost ?? 0;

    let displayText = '';
    if (productCode && productName) {
      displayText = `${productCode} - ${productName}`;
    } else if (productName) {
      displayText = productName;
    } else if (productCode) {
      displayText = productCode;
    }

    this.form.patchValue({
      product_id: productId,
      product_search: displayText,
      unit_cost: unitCost
    });
    this.productSuggestions = [];
  }

  // ============================================================================
  // Material Release Automation
  // ============================================================================

  loadPendingReleaseBatches(): void {
    this.releaseLoading = true;
    console.log('[RELEASE] Iniciando carga de lotes pendientes...');
    
    // Limpiar estados previos
    this.fullyReleasedBatches.clear();
    this.batchesInProcess.clear();
    this.releasedMaterials.clear();
    
    this.materialReleaseService.getPendingReleaseBatches()
      .pipe(
        takeUntil(this.destroy$),
        finalize(() => {
          this.releaseLoading = false;
          console.log('[RELEASE] Carga finalizada');
        })
      )
      .subscribe({
        next: (batches) => {
          this.pendingReleaseBatches = batches;
          console.log('[RELEASE] Lotes cargados:', batches.length);
          batches.forEach(b => {
            console.log(`[RELEASE] Lote #${b.batch?.id} - ${b.product?.name}: ${b.requiredMaterials.length} materiales`);
            b.requiredMaterials.forEach((m: MaterialRequirement) => {
              console.log(`  - ${m.rawMaterialName}: ${m.totalQuantityNeeded} (stock: ${m.currentStock}, OK: ${m.hasSufficientStock})`);
            });
          });
          
          // Verificar los estados reales desde la BD
          this.updateBatchStatusesFromDb(batches);
        },
        error: (err) => {
          console.error('[RELEASE] Error cargando lotes:', err);
          this.alert.error('Error', 'No se pudieron cargar los lotes pendientes');
        }
      });
  }

  /**
   * Verifica los estados reales de los lotes desde la BD
   * Y actualiza los Sets de estado local
   */
  private updateBatchStatusesFromDb(batches: PendingReleaseBatch[]): void {
    console.log('[RELEASE] Verificando estados de lotes desde BD...');
    
    batches.forEach(batch => {
      const batchId = batch.batch?.id;
      if (!batchId) return;
      
      // Si el estado del batch en la BD no es 'planned', marcarlo como completamente liberado
      const batchStatus = batch.batch?.status;
      console.log(`[RELEASE] Lote #${batchId} tiene estado: "${batchStatus}"`);
      
      if (batchStatus && batchStatus !== 'planned') {
        console.log(`[RELEASE] Lote #${batchId} está en estado "${batchStatus}", agregando a fullyReleasedBatches`);
        this.fullyReleasedBatches.add(batchId);
        this.batchesInProcess.add(batchId);
        
        // También marcar todos sus materiales como liberados
        batch.requiredMaterials.forEach((material: MaterialRequirement) => {
          const key = `${batchId}-${material.rawMaterialId}`;
          this.releasedMaterials.add(key);
          console.log(`[RELEASE] Material "${material.rawMaterialName}" marcado como liberado (${key})`);
        });
      }
    });
  }

  openReleaseForMaterial(batch: PendingReleaseBatch, material: MaterialRequirement): void {
    console.log('[RELEASE] Abriendo modal para material:', material.rawMaterialName, 'lote:', batch.batch?.id);
    
    this.releasingMaterial = { batchId: batch.batch?.id || 0, materialId: material.rawMaterialId };
    this.isEditing = false;
    this.formError = null;
    this.productSuggestions = [];
    
    this.form.reset({
      id: null,
      type: 'out',
      product_id: material.rawMaterialId,
      product_search: `${material.rawMaterialCode || ''} ${material.rawMaterialName}`.trim(),
      batch_id: batch.batch?.id,
      quantity: material.totalQuantityNeeded,
      unit_cost: 0,
      production_line: this.productionLines[0] || '',
      notes: `Liberación automática para lote #${batch.batch?.id} - ${batch.product?.name} (${batch.batch?.quantity ?? 0} unidades)`
    });
    
    // Cargar el costo unitario
    if (material.rawMaterialId) {
      this.rawService.getById(material.rawMaterialId).subscribe({
        next: (response: any) => {
          const product = response?.data ?? response;
          const unitCost = product?.unit_cost ?? product?.price ?? product?.cost ?? 0;
          if (unitCost) {
            this.form.patchValue({ unit_cost: unitCost });
          }
        },
        error: () => {}
      });
    }

    // Pre-fill batch field in DOM
    setTimeout(() => {
      const batchOutEl = document.getElementById('batchOut') as HTMLInputElement;
      if (batchOutEl) {
        batchOutEl.value = `Lote Producción #${batch.batch?.id}`;
      }
    }, 100);
    
    this.showModal = true;
  }

  createQuick(): void {
    this.isEditing = false;
    this.form.reset({ 
      type: 'out', 
      quantity: 1, 
      product_id: null, 
      product_search: '', 
      batch_id: null, 
      unit_cost: 0, 
      production_line: '', 
      notes: '' 
    });
    this.formError = null;
    this.productSuggestions = [];
    this.releasingMaterial = null;
    this.showModal = true;
  }

  isReleasingMaterial(batchId: number, materialId: number): boolean {
    return this.releasingMaterial?.batchId === batchId && 
           this.releasingMaterial?.materialId === materialId;
  }

  isMaterialReleased(batchId: number, materialId: number): boolean {
    return this.releasedMaterials.has(`${batchId}-${materialId}`);
  }

  isBatchFullyReleased(batchId: number): boolean {
    return this.fullyReleasedBatches.has(batchId);
  }

  isBatchInProcess(batchId: number): boolean {
    return this.batchesInProcess.has(batchId);
  }

  /**
   * Verifica si todas las materias de un lote están liberadas
   */
  private areAllMaterialsReleased(batchId: number): boolean {
    const batch = this.pendingReleaseBatches.find(b => b.batch?.id === batchId);
    if (!batch) return false;

    return batch.requiredMaterials.every((material: MaterialRequirement) => 
      this.isMaterialReleased(batchId, material.rawMaterialId)
    );
  }

  /**
   * Actualiza el estado del lote a 'in_process'
   * Envía todos los campos requeridos por la API
   */
  private updateBatchStatusToInProcess(batchId: number): void {
    console.log('[RELEASE] Todas las materias liberadas para lote #' + batchId + ', actualizando estado a in_process...');
    
    // Obtener el batch actual con todos sus datos
    const batchData = this.pendingReleaseBatches.find(b => b.batch?.id === batchId);
    if (!batchData?.batch) {
      console.error('[RELEASE] No se encontró el lote #' + batchId);
      this.alert.error('Error', 'No se encontró la información del lote.');
      return;
    }

    const batch = batchData.batch;
    
    // Crear payload completo con todos los campos requeridos por la API
    const updatePayload: Partial<Batch> = {
      name: batch.name || '',
      code: batch.code || '',
      product_id: batch.product_id,
      start_date: batch.start_date || new Date().toISOString(),
      expected_end_date: batch.expected_end_date,
      actual_end_date: batch.actual_end_date,
      status: 'in_process',
      quantity: batch.quantity || 1,
      defect_quantity: batch.defect_quantity,
      notes: batch.notes,
      created_by: batch.created_by
    };

    console.log('[RELEASE] Enviando payload completo:', updatePayload);

    this.batchesService.update(batchId, updatePayload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.log('[RELEASE] Estado del lote actualizado:', res);
          this.fullyReleasedBatches.add(batchId);
          this.batchesInProcess.add(batchId);
          this.alert.success('¡Lote listo!', `El lote #${batchId} ha sido actualizado a "En Proceso". Todas las materias primas fueron liberadas.`);
        },
        error: (err) => {
          console.error('[RELEASE] Error actualizando estado del lote:', err);
          const errorMsg = err?.error?.error || err?.message || 'Error desconocido';
          this.alert.error('Error', 'No se pudo actualizar el estado del lote. ' + errorMsg);
        }
      });
  }

  refreshAfterRelease(): void {
    if (this.releasingMaterial) {
      const { batchId, materialId } = this.releasingMaterial;
      const key = `${batchId}-${materialId}`;
      this.releasedMaterials.add(key);
      console.log('[RELEASE] Material marcado como liberado:', key);

      // Verificar si todas las materias del lote están liberadas
      if (this.areAllMaterialsReleased(batchId)) {
        this.updateBatchStatusToInProcess(batchId);
      }
    }
    this.releasingMaterial = null;
    this.loadPendingReleaseBatches();
  }

  closeModal(): void {
    this.showModal = false;
    this.releasingMaterial = null;
    this.formError = null;
  }

  cancelModal(): void {
    this.closeModal();
  }

  // ============================================================================
  // Notes Formatting (same as inventory-movement)
  // ============================================================================

  formatNotesData(): string {
    const parts: string[] = [];

    const seals = (document.getElementById('sealsOut') as HTMLSelectElement)?.value || '';
    const packageType = (document.getElementById('packageTypeOut') as HTMLInputElement)?.value || '';
    const cleanPackage = (document.getElementById('cleanPackageOut') as HTMLSelectElement)?.value || '';
    const transportConditions = (document.getElementById('transportConditionsOut') as HTMLSelectElement)?.value || '';
    const accepted = (document.getElementById('acceptedOut') as HTMLSelectElement)?.value || '';
    const observations = (document.getElementById('observationsOut') as HTMLTextAreaElement)?.value || '';
    const expiryDate = (document.getElementById('expiryDateOut') as HTMLInputElement)?.value || '';
    const supplier = (document.getElementById('supplierOut') as HTMLInputElement)?.value || '';
    const batch = (document.getElementById('batchOut') as HTMLInputElement)?.value || '';
    const receivedBy = (document.getElementById('receivedByOut') as HTMLInputElement)?.value || '';
    const deliveredBy = (document.getElementById('deliveredByOut') as HTMLInputElement)?.value || '';

    if (seals) parts.push(`Sellos: ${seals}`);
    if (packageType) parts.push(`Tipo de Empaque: ${packageType}`);
    if (cleanPackage) parts.push(`Empaque Limpio: ${cleanPackage}`);
    if (transportConditions) parts.push(`Condiciones de Transporte: ${transportConditions}`);
    if (accepted) parts.push(`Aceptado: ${accepted}`);
    if (observations) parts.push(`Observaciones: ${observations}`);
    if (expiryDate) parts.push(`Vencimiento: ${expiryDate}`);
    if (supplier) parts.push(`Proveedor: ${supplier}`);
    if (batch) parts.push(`Lote: ${batch}`);
    if (receivedBy) parts.push(`Recibido por: ${receivedBy}`);
    if (deliveredBy) parts.push(`Entregado por: ${deliveredBy}`);

    return parts.length > 0 ? parts.join(' | ') : '';
  }

  updateNotesSummary(): void {
    const formattedNotes = this.formatNotesData();
    this.form.patchValue({ notes: formattedNotes });
  }

  // ============================================================================
  // Batch Lookup
  // ============================================================================

  prefillOutByBatch(): void {
    const batchInput = document.getElementById('batchOut') as HTMLInputElement;
    const batchCode = (batchInput?.value || '').trim();

    if (!batchCode) {
      this.alert.warning('Falta el lote', 'Ingresa el número de lote para buscar la entrada.');
      return;
    }

    this.loadingBatchLookup = true;

    // Consultar al backend filtrando por entrada y notas
    this.invService.listWithoutDate({ movement_type: 'in', notes: batchCode }, 50, 1).subscribe({
      next: (res) => {
        const entries = res?.data ?? [];
        const match = entries.find((item: any) => this.matchesBatch(item, batchCode));

        if (match) {
          this.applyEntryDataToOut(match, batchCode);
          this.alert.success('Lote encontrado', 'Se precargaron los datos del lote.');
        } else {
          this.alert.warning('Sin coincidencias', 'No se encontró ninguna entrada con ese lote.');
        }
        this.loadingBatchLookup = false;
      },
      error: (err) => {
        this.loadingBatchLookup = false;
        const msg = err?.error?.message || err?.message || 'No se pudo buscar el lote en el servidor.';
        this.alert.error('Error buscando lote', msg);
      }
    });
  }

  openBatchSearchModal(): void {
    this.batchSearchPage = 1;
    this.resetBatchFilters();
    this.showBatchSearchModal = true;
    
    // Asegurar que las materias primas estén cargadas
    if (!this.rawMaterialsLoaded || this.rawMaterialsMap.size === 0) {
      this.batchSearchLoading = true;
      this.rawService.list({}, 1, 500).subscribe({
        next: (res) => {
          const items = res?.data ?? [];
          items.forEach((item: any) => {
            if (item?.id) {
              this.rawMaterialsMap.set(Number(item.id), {
                id: item.id,
                name: item.name ?? item.product_name ?? '',
                code: item.code ?? item.product_code ?? null,
                unit_cost: item.unit_cost ?? item.price ?? null
              });
            }
          });
          this.rawMaterialsLoaded = true;
          this.loadAllEntryMovements();
        },
        error: () => {
          this.loadAllEntryMovements();
        }
      });
    } else {
      this.loadAllEntryMovements();
    }
  }

  private loadAllEntryMovements(): void {
    if (this.allEntryMovementsLoaded && this.allEntryMovements.length > 0) {
      this.buildBatchSearchFromCache();
      return;
    }

    this.batchSearchLoading = true;
    this.invService.listWithoutDate({ movement_type: 'in' }, 500, 1).subscribe({
      next: (res) => {
        const data = res?.data ?? [];
        this.allEntryMovements = data.map((item: any) => this.enrichWithProductData(item));
        this.allEntryMovementsLoaded = true;
        this.buildBatchSearchFromCache();
      },
      error: () => {
        this.allEntryMovements = [];
        this.buildBatchSearchFromCache();
      }
    });
  }

  private enrichWithProductData(item: any): any {
    if (item?.product_name || item?.raw_material_name) {
      return item;
    }
    const productId = item?.product_id ?? item?.raw_material_id;
    if (productId && this.rawMaterialsMap.has(Number(productId))) {
      const product = this.rawMaterialsMap.get(Number(productId));
      return {
        ...item,
        product_name: product?.name ?? null,
        raw_material_name: product?.name ?? null,
        product_code: product?.code ?? null,
        raw_material_code: product?.code ?? null
      };
    }
    return item;
  }

  private buildBatchSearchFromCache(): void {
    const currentProductId = this.form.get('product_id')?.value;
    let entryMovements = [...this.allEntryMovements];
    if (currentProductId) {
      entryMovements = entryMovements.filter((m: any) => {
        const prodId = m?.product_id ?? m?.raw_material_id;
        return Number(prodId) === Number(currentProductId);
      });
    }
    this.batchSearchResults = entryMovements.map((item: any) => this.decorateBatchRow(item));
    const total = this.batchSearchResults.length;
    this.batchSearchMeta = {
      total: total,
      per_page: this.batchSearchPerPage,
      current_page: 1,
      last_page: Math.ceil(total / this.batchSearchPerPage) || 1
    };
    this.rebuildBatchSearchView();
    this.batchSearchLoading = false;
  }

  private decorateBatchRow(item: any): any {
    return {
      ...item,
      parsed: {
        batch: this.parseNotesField(item?.notes, 'Lote') || item?.batch_code || item?.batch || '',
        supplier: this.parseNotesField(item?.notes, 'Proveedor') || '',
        expiry: this.parseNotesField(item?.notes, 'Vencimiento') || '',
        accepted: this.parseNotesField(item?.notes, 'Aceptado') || '',
        status: this.parseNotesField(item?.notes, 'Aceptado') || ''
      }
    };
  }

  onBatchFiltersChange(): void {
    this.batchSearchPage = 1;
    this.rebuildBatchSearchView();
  }

  reloadBatchSearchData(): void {
    this.allEntryMovementsLoaded = false;
    this.allEntryMovements = [];
    this.rawMaterialsLoaded = false;
    this.rawMaterialsMap.clear();
    
    this.batchSearchLoading = true;
    this.rawService.list({}, 1, 500).subscribe({
      next: (res) => {
        const items = res?.data ?? [];
        items.forEach((item: any) => {
          if (item?.id) {
            this.rawMaterialsMap.set(Number(item.id), {
              id: item.id,
              name: item.name ?? item.product_name ?? '',
              code: item.code ?? item.product_code ?? null,
              unit_cost: item.unit_cost ?? item.price ?? null
            });
          }
        });
        this.rawMaterialsLoaded = true;
        this.loadAllEntryMovements();
      },
      error: () => {
        this.loadAllEntryMovements();
      }
    });
  }

  resetBatchFilters(): void {
    this.batchSearchFilters = {
      productText: '',
      supplier: '',
      ingressDate: '',
      expiryDate: '',
      status: '',
      freeText: ''
    };
    this.batchSearchPage = 1;
    this.rebuildBatchSearchView();
  }

  rebuildBatchSearchView(): void {
    const { productText, supplier, ingressDate, expiryDate, status, freeText } = this.batchSearchFilters;
    const norm = (v: string) => (v || '').toLowerCase();

    let rows = [...this.batchSearchResults];

    rows = rows.filter((row) => {
      const productName = norm(row?.product_name ?? row?.raw_material_name ?? '');
      const productCode = norm(row?.product_code ?? row?.raw_material_code ?? '');
      const supplierVal = norm(row?.parsed?.supplier ?? '');
      const acceptedVal = norm(row?.parsed?.accepted ?? row?.parsed?.status ?? '');
      const expiryVal = (row?.parsed?.expiry ?? '').slice(0, 10);
      const ingressVal = (row?.created_at ?? '').slice(0, 10);

      if (productText && !(productName.includes(norm(productText)) || productCode.includes(norm(productText)))) {
        return false;
      }
      if (supplier && !supplierVal.includes(norm(supplier))) {
        return false;
      }
      if (status && acceptedVal !== norm(status)) {
        return false;
      }
      if (expiryDate && expiryVal !== expiryDate) {
        return false;
      }
      if (ingressDate && ingressVal !== ingressDate) {
        return false;
      }
      if (freeText) {
        const haystack = [
          row?.notes,
          row?.parsed?.batch,
          row?.parsed?.supplier,
          row?.parsed?.accepted,
          row?.parsed?.expiry,
          row?.product_name,
          row?.product_code
        ].map(x => norm(x || '')).join(' ');
        if (!haystack.includes(norm(freeText))) {
          return false;
        }
      }
      return true;
    });

    rows.sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.updated_at || 0).getTime();
      const dateB = new Date(b?.created_at || b?.updated_at || 0).getTime();
      return this.batchSearchSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    const total = rows.length;
    this.batchSearchMeta = {
      total: total,
      per_page: this.batchSearchPerPage,
      current_page: this.batchSearchPage,
      last_page: Math.ceil(total / this.batchSearchPerPage) || 1
    };

    const start = (this.batchSearchPage - 1) * this.batchSearchPerPage;
    const end = start + this.batchSearchPerPage;
    this.batchSearchView = rows.slice(start, end);
  }

  toggleBatchSort(): void {
    this.batchSearchSort = this.batchSearchSort === 'desc' ? 'asc' : 'desc';
    this.rebuildBatchSearchView();
  }

  batchSearchPrevPage(): void {
    if (this.batchSearchPage > 1) {
      this.batchSearchPage--;
      this.rebuildBatchSearchView();
    }
  }

  batchSearchNextPage(): void {
    const last = this.batchSearchMeta?.last_page ?? null;
    if (!last || this.batchSearchPage < last) {
      this.batchSearchPage++;
      this.rebuildBatchSearchView();
    }
  }

  closeBatchSearchModal(): void {
    this.showBatchSearchModal = false;
    this.batchSearchLoading = false;
  }

  selectBatchFromModal(row: any): void {
    this.applyEntryDataToOut(row, row?.parsed?.batch ?? '');
    this.showBatchSearchModal = false;
  }

  private matchesBatch(movement: any, batchCode: string): boolean {
    const target = (batchCode || '').trim().toLowerCase();
    if (!target) return false;

    const notesBatch = (this.parseNotesField(movement?.notes, 'Lote') || '').trim().toLowerCase();
    const batchField = (movement?.batch_code || movement?.batch || '').toLowerCase();
    return notesBatch === target || batchField === target;
  }

  private parseNotesField(notes: string | null | undefined, fieldName: string): string {
    if (!notes) return '';
    const parts = notes.split('|').map(p => p.trim());
    for (const part of parts) {
      if (part.toLowerCase().startsWith(fieldName.toLowerCase() + ':')) {
        return part.substring(fieldName.length + 1).trim();
      }
    }
    return '';
  }

  getBatchFromNotes(notes: string | null | undefined): string {
    return this.parseNotesField(notes, 'Lote') || '-';
  }

  private applyEntryDataToOut(entry: any, fallbackBatch?: string): void {
    const supplier = this.parseNotesField(entry?.notes, 'Proveedor');
    const expiryDate = this.parseNotesField(entry?.notes, 'Vencimiento');
    const seals = this.parseNotesField(entry?.notes, 'Sellos');
    const packageType = this.parseNotesField(entry?.notes, 'Tipo de Empaque');
    const cleanPackage = this.parseNotesField(entry?.notes, 'Empaque Limpio');
    const transportConditions = this.parseNotesField(entry?.notes, 'Condiciones de Transporte');
    const accepted = this.parseNotesField(entry?.notes, 'Aceptado');
    const observations = this.parseNotesField(entry?.notes, 'Observaciones');
    const receivedBy = this.parseNotesField(entry?.notes, 'Recibido por');
    const deliveredBy = this.parseNotesField(entry?.notes, 'Entregado por');
    const batch = this.parseNotesField(entry?.notes, 'Lote') || fallbackBatch || '';

    const setValue = (id: string, value: string | null | undefined): void => {
      const el = document.getElementById(id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (el && value !== undefined && value !== null) {
        el.value = value;
      }
    };

    setValue('batchOut', batch);
    setValue('supplierOut', supplier);
    setValue('expiryDateOut', expiryDate);
    setValue('sealsOut', seals);
    setValue('packageTypeOut', packageType);
    setValue('cleanPackageOut', cleanPackage);
    setValue('transportConditionsOut', transportConditions);
    setValue('acceptedOut', accepted);
    setValue('observationsOut', observations);
    setValue('receivedByOut', receivedBy);
    setValue('deliveredByOut', deliveredBy);

    // Auto-select product if match
    if (entry?.raw_material_id) {
      this.form.patchValue({ product_id: entry.raw_material_id });
      const productName = entry?.raw_material?.name || entry?.product_name || '';
      const productCode = entry?.raw_material?.code || entry?.product_code || '';
      if (productName || productCode) {
        this.form.patchValue({ product_search: `${productCode} ${productName}`.trim() });
      }
    }

    this.updateNotesSummary();
  }

  // ============================================================================
  // Submit
  // ============================================================================

  submit(): void {
    this.formError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Corrige los errores del formulario.';
      return;
    }

    // Update notes from DOM fields
    this.updateNotesSummary();

    const formValue = { ...this.form.value };

    const payload: any = {
      raw_material_id: formValue.product_id,
      batch_id: formValue.batch_id || null,
      movement_type: formValue.type,
      quantity: formValue.quantity,
      unit_cost: formValue.unit_cost,
      production_line: formValue.production_line || null,
      notes: formValue.notes || ''
    };

    console.log('[RELEASE] Payload enviado:', payload);

    this.loading = true;
    this.invService.create(payload).subscribe({
      next: (res) => {
        this.loading = false;

        if (res?.success) {
          this.showModal = false;
          this.refreshAfterRelease();
          if (res.message) {
            this.alert.success('Éxito', res.message);
          } else {
            this.alert.success('Éxito', 'Material liberado correctamente');
          }
        } else {
          this.formError = res?.message || 'Error procesando la solicitud';
        }
      },
      error: (err) => {
        this.loading = false;
        if (err?.error?.errors) {
          const errors = err.error.errors;
          const errorMessages = [];
          if (errors.raw_material_id) errorMessages.push('• ' + errors.raw_material_id[0]);
          if (errors.movement_type) errorMessages.push('• ' + errors.movement_type[0]);
          if (errors.unit_cost) errorMessages.push('• ' + errors.unit_cost[0]);
          if (errors.quantity) errorMessages.push('• ' + errors.quantity[0]);
          this.formError = errorMessages.length > 0
            ? 'Errores de validación:\n' + errorMessages.join('\n')
            : 'Error de validación en el formulario';
          this.alert.error('Error de validación', this.formError ?? undefined);
        } else if (err?.error?.message) {
          this.formError = err.error.message;
          this.alert.error('Error', this.formError ?? undefined);
        } else if (err?.message) {
          this.formError = err.message;
          this.alert.error('Error', this.formError ?? undefined);
        } else {
          this.formError = 'Error enviando datos al servidor';
          this.alert.error('Error', this.formError ?? undefined);
        }
      }
    });
  }
}
