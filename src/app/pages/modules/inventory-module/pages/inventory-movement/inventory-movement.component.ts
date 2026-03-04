import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryMovementService } from '../../services/inventory-movement.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { MaterialReleaseService, PendingReleaseBatch, MaterialRequirement } from '../../services/material-release.service';
import { Subject, Subscription, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map, takeUntil, finalize } from 'rxjs/operators';
import { AlertService } from 'src/app/core/services/alert.service';
import { ReportService } from 'src/app/core/services/report.service';


@Component({
  selector: 'app-inventory-movement',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
  templateUrl: './inventory-movement.component.html',
  styleUrls: ['./inventory-movement.component.scss']
})

// envial los filtros por parametro ejmplo: { movement_type: 'in' }

export class InventoryMovementComponent implements OnInit, OnDestroy {
  movements: any[] = [];
  private movementsLoaded = false;
  loading = false;
  error: string | null = null;
  page = 1;
  perPage = 500;
  meta: any = null;
  hasActiveFilters = false;
  totalRawMaterialsOut = 0;
  totalRawMaterialsIn = 0;

  filters = {
    type: '',
    date: '',
    product: '',
    production_line: '',
    general: ''
  };

  onFilterChange() {
    this.applyFilters();
  }


  // Modal & form
  showModal = false;
  isEditing = false;
  form: FormGroup;
  formError: string | null = null;
  loadingProductDetails = false;
  generatingReport = false;
  loadingBatchLookup = false;
  // Product search
  productSuggestions: any[] = [];
  private productSearch$ = new Subject<string>();
  private productSearchSub: Subscription | null = null;
  private productSearchControlSub: Subscription | null = null;
  private cachedProducts: any[] = [];
  private productsCached = false;
  private rawMaterialsLoaded = false;
  private rawMaterialsMap = new Map<number, { id: number; name: string; code: string | null; unit_cost?: number | null }>();
  private rawMaterialsList: any[] = [];
  // Filter product search
  filterProductSearch = '';
  filterProductSuggestions: any[] = [];
  selectedFilterProduct: any = null;
  // Batches
  availableBatches: any[] = [];
  loadingBatches = false;

  // Sorting
  sortColumn: string = '';
  sortDirection: 'asc' | 'desc' = 'asc';

  sort(column: string): void {
    if (this.sortColumn === column) {
      // Si es la misma columna, alternar dirección
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.movements.sort((a, b) => {
      let aValue = a[column];
      let bValue = b[column];
      // Normalizar valores nulos
      if (aValue === undefined || aValue === null) aValue = '';
      if (bValue === undefined || bValue === null) bValue = '';
      // Si es número
      if (!isNaN(Number(aValue)) && !isNaN(Number(bValue))) {
        aValue = Number(aValue);
        bValue = Number(bValue);
      } else {
        aValue = aValue.toString().toLowerCase();
        bValue = bValue.toString().toLowerCase();
      }
      if (aValue < bValue) return this.sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return this.sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  // Batch search modal (entrada -> salida)
  showBatchSearchModal = false;
  batchSearchLoading = false;
  batchSearchResults: any[] = [];
  batchSearchView: any[] = [];
  batchSearchPage = 1;
  batchSearchPerPage = 10;
  batchSearchMeta: any = null;
  batchSearchSort: 'asc' | 'desc' = 'desc';
  // Almacena TODOS los movimientos de entrada (sin filtro de fecha) para la modal
  private allEntryMovements: any[] = [];
  private allEntryMovementsLoaded = false;
  batchSearchFilters = {
    productText: '',
    supplier: '',
    ingressDate: '',
    expiryDate: '',
    status: '',
    freeText: ''
  };

  // Details modal
  currentDetailsModal: { label: string; value: string }[] = [];
  showDetailsModalFlag = false;

  // Pending release batches (Release automation)
  pendingReleaseBatches: PendingReleaseBatch[] = [];
  releaseLoading = false;
  releasingMaterial: { batchId: number; materialId: number } | null = null;
  releasedMaterials: Set<string> = new Set(); // Rastrea materiales ya liberados ("batchId-materialId")
  productionLines = ['Línea 1', 'Línea 2', 'Línea 3', 'Producción General'];
  private destroy$ = new Subject<void>();

  /**
   * Parsea las notas formateadas y extrae campos específicos
   */
  parseNotesField(notes: string, field: string): string {
    if (!notes) return '';
    const regex = new RegExp(`${field}:\\s*([^|]+)`, 'i');
    const match = notes.match(regex);
    return match ? match[1].trim() : '';
  }

  constructor(
    private invService: InventoryMovementService,
    private fb: FormBuilder,
    private rawService: RawMaterialsService,
    private alert: AlertService,
    private reportService: ReportService,
    private materialReleaseService: MaterialReleaseService
  ) {
    this.form = this.fb.group({
      id: [null],
      type: ['in', [Validators.required]],
      product_id: [null, [Validators.required]],
      product_search: [''],
      batch_id: [null],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_cost: [0, [Validators.required, Validators.min(0)]],
      production_line: [''],
      notes: ['']
    });

    // Cambiar validación de cantidad según el tipo de movimiento
    this.form.get('type')?.valueChanges.subscribe(type => {
      const quantityControl = this.form.get('quantity');
      if (type === 'adjustment') {
        // Para ajustes, permitir valores negativos
        quantityControl?.setValidators([Validators.required]);
      } else {
        // Para entradas y salidas, solo valores positivos
        quantityControl?.setValidators([Validators.required, Validators.min(1)]);
      }
      quantityControl?.updateValueAndValidity();
    });
  }

  ngOnInit(): void {
    this.loadMovements();
    this.loadRawMaterials();
    this.loadPendingReleaseBatches();
    // subscribe product search
    this.productSearchSub = this.productSearch$
      .pipe(
        debounceTime(300),
        distinctUntilChanged(),
        switchMap((q) => {
          const term = (q || '').trim();
          if (!term) return of({ data: [], meta: null });

          // Si ya tenemos productos en caché, filtrarlos
          if (this.productsCached && this.cachedProducts.length > 0) {
            const filteredData = this.cachedProducts.filter((item: any) => {
              const name = (item?.name || '').toLowerCase();
              const code = (item?.code || '').toLowerCase();
              const searchTerm = term.toLowerCase();
              return name.includes(searchTerm) || code.includes(searchTerm);
            });
            return of({ data: filteredData.slice(0, 10), meta: null });
          }

          // Si ya cargamos materias primas, usar la lista local
          if (this.rawMaterialsLoaded && this.rawMaterialsList.length > 0) {
            const filteredData = this.rawMaterialsList.filter((item: any) => {
              const name = (item?.name || '').toLowerCase();
              const code = (item?.code || '').toLowerCase();
              const searchTerm = term.toLowerCase();
              return name.includes(searchTerm) || code.includes(searchTerm);
            });
            // cachear para próximas búsquedas
            this.cachedProducts = this.rawMaterialsList;
            this.productsCached = true;
            return of({ data: filteredData.slice(0, 10), meta: null });
          }

          // Si no hay caché, obtener productos del servidor
          return this.rawService.list({}, 1, 200).pipe(
            map((res: any) => {
              const data = this.normalizeProducts(res?.data) ?? [];

              // Guardar en caché si hay datos
              if (Array.isArray(data) && data.length > 0) {
                this.cachedProducts = data;
                this.productsCached = true;
              }

              // Fallback a productos presentes en la tabla si la API devuelve vacío
              const source = (this.cachedProducts.length ? this.cachedProducts : data);
              const mergedSource = source.length > 0 ? source : this.extractProductsFromMovements();

              const filteredData = mergedSource.filter((item: any) => {
                const name = (item?.name || '').toLowerCase();
                const code = (item?.code || '').toLowerCase();
                const searchTerm = term.toLowerCase();
                return name.includes(searchTerm) || code.includes(searchTerm);
              });

              return { data: filteredData.slice(0, 10), meta: res?.meta };
            }),
            catchError((error) => {
              console.error('Error searching products:', error);
              try { this.alert.error('No se pudo cargar el catálogo de materias primas'); } catch (e) { /* noop */ }
              // Fallback: usar productos de la tabla ya cargada
              const fallback = this.extractProductsFromMovements();
              const filteredFallback = fallback.filter((item: any) => {
                const name = (item?.name || '').toLowerCase();
                const code = (item?.code || '').toLowerCase();
                const searchTerm = term.toLowerCase();
                return name.includes(searchTerm) || code.includes(searchTerm);
              });
              return of({ data: filteredFallback.slice(0, 10), meta: null });
            })
          );
        })
      )
      .subscribe((res: any) => {
        this.productSuggestions = res?.data ?? [];
      });

    // watch product_search control to emit to subject
    this.productSearchControlSub = this.form.get('product_search')?.valueChanges.pipe(debounceTime(0)).subscribe((v) => {
      this.productSearch$.next(v || '');
    }) ?? null;
  }

  ngOnDestroy(): void {
    this.productSearchSub?.unsubscribe();
    this.productSearchControlSub?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Limpiar caché de productos si es necesario
  clearProductCache(): void {
    this.cachedProducts = [];
    this.productsCached = false;
  }

  private normalizeProducts(raw: any): any[] {
    if (Array.isArray(raw)) return raw;
    if (Array.isArray(raw?.data)) return raw.data;
    if (Array.isArray(raw?.items)) return raw.items;
    return [];
  }

  private loadRawMaterials(): void {
    console.log('[RAW MATERIALS] Iniciando carga de materias primas...');
    this.rawService.list({}, 1, 500).subscribe({
      next: (res: any) => {
        console.log('[RAW MATERIALS] Respuesta recibida:', res);
        
        // Intentar extraer datos de múltiples formatos posibles
        let data: any[] = [];
        if (Array.isArray(res)) {
          data = res;
        } else if (Array.isArray(res?.data)) {
          data = res.data;
        } else if (Array.isArray(res?.data?.data)) {
          data = res.data.data;
        } else if (Array.isArray(res?.items)) {
          data = res.items;
        }
        
        console.log('[RAW MATERIALS] Datos extraídos:', data.length, 'items');
        
        if (data.length > 0) {
          this.rawMaterialsList = data;
          this.cachedProducts = data;
          this.productsCached = true;
          this.rawMaterialsLoaded = true;

          // Construir mapa id -> detalle
          this.rawMaterialsMap.clear();
          data.forEach((item: any) => {
            const itemId = item?.id ?? item?.raw_material_id;
            if (itemId) {
              this.rawMaterialsMap.set(Number(itemId), {
                id: Number(itemId),
                name: item?.name ?? item?.raw_material_name ?? '',
                code: item?.code ?? item?.raw_material_code ?? null,
                unit_cost: item?.unit_cost ?? item?.price ?? item?.cost ?? null,
              });
            }
          });
          
          console.log('[RAW MATERIALS] Mapa construido con', this.rawMaterialsMap.size, 'entradas');
          console.log('[RAW MATERIALS] Ejemplo:', this.rawMaterialsMap.entries().next().value);
          
          // Enriquecer movimientos ya cargados
          this.applyMapToMovements();
        } else {
          console.warn('[RAW MATERIALS] No se encontraron materias primas en la respuesta');
        }
      },
      error: (err) => {
        console.error('[RAW MATERIALS] Error cargando materias primas:', err);
      }
    });
  }

  private applyMapToMovements(): void {
    console.log('[APPLY MAP] Aplicando mapa a movimientos. Movimientos:', this.movements?.length, 'Mapa size:', this.rawMaterialsMap.size);
    
    if (!this.movements || this.movements.length === 0) {
      console.log('[APPLY MAP] No hay movimientos para actualizar');
      return;
    }
    
    if (this.rawMaterialsMap.size === 0) {
      console.log('[APPLY MAP] Mapa vacío, no se pueden resolver nombres');
      return;
    }
    
    let updated = 0;
    this.movements = this.movements.map(movement => {
      const productId = movement?.raw_material_id ?? movement?.product_id;
      console.log('[APPLY MAP] Buscando ID:', productId, 'tipo:', typeof productId);
      
      const rm = this.rawMaterialsMap.get(Number(productId));
      
      if (rm) {
        updated++;
        console.log('[APPLY MAP] Encontrado:', rm.name, rm.code);
        return {
          ...movement,
          product_name: rm.name || movement?.product_name || movement?.raw_material_name,
          product_code: rm.code || movement?.product_code || movement?.raw_material_code,
          raw_material_name: rm.name || movement?.raw_material_name,
          raw_material_code: rm.code || movement?.raw_material_code,
        };
      }
      return movement;
    });
    
    console.log('[APPLY MAP] Movimientos actualizados:', updated, 'de', this.movements.length);
  }

  private extractProductsFromMovements(): any[] {
    const set = new Map<number | string, any>();

    (this.movements || []).forEach((m: any) => {
      const id = m?.raw_material_id ?? m?.product_id;
      if (!id) return;
      if (set.has(id)) return;

      set.set(id, {
        id,
        name: m?.product_name ?? m?.raw_material_name ?? '',
        code: m?.product_code ?? m?.raw_material_code ?? '',
        unit_cost: m?.unit_cost ?? m?.price ?? m?.cost ?? 0,
      });
    });

    return Array.from(set.values());
  }

  loadMovements(): void {
    this.loading = true;
    this.error = null;

    // Si hay filtros activos, usar applyFilters en su lugar
    if (this.hasActiveFilters) {
      this.applyFilters();
      return;
    }

    this.invService.list({}, this.perPage, this.page).subscribe({
      next: (res) => {
        // El backend devuelve { success, message, data, meta }
        if (res?.success && Array.isArray(res?.data)) {
          this.movements = res.data;
          this.meta = res.meta || null;
          this.movementsLoaded = true;

          // Aplicar nombres/códigos desde el mapa ya cargado, si existe
          this.applyMapToMovements();

          // Cargar nombres y códigos de productos para cada movimiento
          this.loadProductDetailsForMovements();
        } else {
          // Fallback para otras estructuras de respuesta
          this.movements = [];
          this.meta = null;
          this.loading = false;
        }
      },
      error: (err) => {
        this.loading = false;
        // Manejar errores del backend
        const message = err?.error?.message || err?.message || 'Error cargando movimientos de inventario';
        this.error = message;
        try { this.alert.error('Error cargando movimientos', message); } catch (e) { /* noop */ }
      }
    });
  }
  applyFilters(): void {
    const filters: any = {};

    if (this.filters.type) filters.movement_type = this.filters.type;
    if (this.filters.date) filters.created_at = this.filters.date;
    if (this.filters.production_line) filters.production_line = this.filters.production_line;
    if (this.filters.product) filters.raw_material_id = this.filters.product;
    if (this.filters.general) filters.notes = this.filters.general;

    // Marcar si hay filtros activos
    this.hasActiveFilters = Object.keys(filters).length > 0;

    this.page = 1; // Reset page to 1 on new filter application
    this.loading = true;

    this.invService.list(filters, this.perPage, this.page).subscribe({
      next: (res) => {
        this.movements = res.data || [];
        this.meta = res.meta || null;
        this.loading = false;
        // Cargar detalles de productos para los movimientos filtrados
        this.loadProductDetailsForMovements();
      },
      error: (err) => {
        this.loading = false;
        this.error = err?.error?.message || 'Error cargando movimientos';
      }
    });
  }

  resetFilters(): void {
    this.filters = {
      type: '',
      date: '',
      product: '',
      production_line: '',
      general: ''
    };
    this.filterProductSearch = '';
    this.filterProductSuggestions = [];
    this.selectedFilterProduct = null;
    this.hasActiveFilters = false;
    this.page = 1;
    this.loadMovements();
  }

  searchFilterProducts(event: any): void {
    const searchTerm = this.filterProductSearch?.trim().toLowerCase();
    
    if (!searchTerm || searchTerm.length < 1) {
      this.filterProductSuggestions = [];
      return;
    }

    // Filtrar productos en caché
    this.filterProductSuggestions = this.cachedProducts
      .filter(p => {
        const name = (p?.name ?? p?.product_name ?? '').toLowerCase();
        const code = (p?.code ?? p?.product_code ?? '').toLowerCase();
        return name.includes(searchTerm) || code.includes(searchTerm);
      })
      .slice(0, 8);
  }

  selectFilterProduct(product: any): void {
    if (!product) return;
    
    this.selectedFilterProduct = product;
    this.filters.product = product?.id ?? product?.product_id;
    this.filterProductSearch = `${product?.code ?? product?.product_code} - ${product?.name ?? product?.product_name}`;
    this.filterProductSuggestions = [];
    
    // Aplicar filtros automáticamente
    this.applyFilters();
  }

  clearFilterProduct(): void {
    this.filterProductSearch = '';
    this.filterProductSuggestions = [];
    this.selectedFilterProduct = null;
    this.filters.product = '';
  }

  private loadProductDetailsForMovements(): void {
    if (!this.movements || this.movements.length === 0) {
      this.loading = false;
      return;
    }

    // Extraer IDs únicos de productos
    const productIds = [...new Set(
      this.movements
        .map(m => m?.raw_material_id ?? m?.product_id)
        .filter(id => id != null)
    )];

    console.log('IDs de productos a cargar:', productIds);

    if (productIds.length === 0) {
      this.loading = false;
      return;
    }

    // Intentar resolver con el mapa local primero
    const productMap = new Map<number, any>();
    productIds.forEach(id => {
      if (this.rawMaterialsMap.has(Number(id))) {
        productMap.set(Number(id), this.rawMaterialsMap.get(Number(id)));
      }
    });

    // IDs que faltan del mapa local
    const missingIds = productIds.filter(id => !productMap.has(Number(id)));

    const handleUpdateMovements = () => {
      this.movements = this.movements.map(movement => {
        const productId = movement?.raw_material_id ?? movement?.product_id;
        const productDetails = productMap.get(Number(productId));

        if (productDetails) {
          return {
            ...movement,
            product_name: productDetails.name,
            product_code: productDetails.code,
            raw_material_name: productDetails.name,
            raw_material_code: productDetails.code
          };
        }

        return movement;
      });
      this.loading = false;
    };

    // Si no falta ninguno, actualizar y salir
    if (missingIds.length === 0) {
      handleUpdateMovements();
      return;
    }

    // Cargar detalles faltantes en paralelo usando forkJoin
    const productCalls = missingIds.map(id =>
      this.rawService.getById(id).pipe(
        map((response: any) => {
          const product = response?.data ?? response;
          return {
            id,
            name: product?.name || `Producto ${id}`,
            code: product?.code || null,
            price: product?.price ?? product?.unit_cost ?? product?.cost
          };
        }),
        catchError((error) => {
          console.error(`Error cargando producto ${id}:`, error);
          return of({
            id,
            name: `Producto ${id}`,
            code: null,
            price: null
          });
        })
      )
    );

    forkJoin(productCalls).subscribe({
      next: (products) => {
        // Añadir los productos obtenidos al mapa y al cache global
        products.forEach(p => {
          productMap.set(Number(p.id), p);
          this.rawMaterialsMap.set(Number(p.id), p);
        });

        handleUpdateMovements();
      },
      error: (error) => {
        console.error('Error cargando detalles de productos:', error);
        handleUpdateMovements();
      }
    });
  }

  deleteMovement(id: number): void {
    this.alert.confirm('Eliminar movimiento', '¿Eliminar movimiento de inventario?').then(result => {
      if (!result.isConfirmed) return;
      this.invService.delete(id).subscribe({
        next: (res) => {
          // El backend devuelve { message } en caso de éxito
          this.loadMovements();
          try { this.alert.success('Movimiento eliminado', res?.message || 'El movimiento fue eliminado'); } catch (e) { /* noop */ }
        },
        error: (err) => {
          const errorMsg = err?.error?.message || err?.message || 'Error eliminando movimiento';
          try { this.alert.error('Error eliminando', errorMsg); } catch (e) { /* noop */ }
        }
      });
    });
  }

  createQuick(): void {
    // Abrir modal en modo crear
    this.isEditing = false;
    this.form.reset({ type: 'in', quantity: 1, product_id: null, product_search: '', batch_id: null, unit_cost: 0, production_line: '', notes: '' });
    this.formError = null;
    this.productSuggestions = [];
    this.availableBatches = [];

    // Limpiar campos de notas
    this.parseAndLoadNotes('');

    this.showModal = true;
  }

  openEdit(m: any): void {
    console.log('Datos del movimiento recibido:', m);

    this.isEditing = true;
    // Normalizar el tipo de movimiento a minúsculas
    let movementType = m?.type ?? m?.movement_type ?? 'in';
    movementType = movementType.toLowerCase();

    // Obtener el ID del producto/materia prima
    const productId = m?.product_id ?? m?.raw_material_id;
    console.log('ID del producto extraído:', productId);

    // Cargar datos básicos del movimiento
    this.form.patchValue({
      id: m?.id ?? null,
      type: movementType,
      product_id: productId,
      product_search: '', // Se cargará después con los datos del servicio
      batch_id: m?.batch_id ?? null,
      quantity: m?.quantity ?? 1,
      unit_cost: m?.unit_cost ?? 0,
      production_line: m?.production_line ?? '',
      notes: m?.notes ?? ''
    });

    this.formError = null;
    this.productSuggestions = [];

    // Si hay un ID de producto, obtener los detalles completos del servicio
    if (productId) {
      this.loadingProductDetails = true;
      console.log('Cargando producto con ID:', productId);

      this.rawService.getById(productId).subscribe({
        next: (response: any) => {
          this.loadingProductDetails = false;
          console.log('Respuesta del servicio de materias primas:', response);

          // El servicio puede devolver { success, data } o directamente el objeto
          const product = response?.data ?? response;
          console.log('Datos del producto extraídos:', product);

          // Construir el texto de visualización profesional
          let displayText = '';
          const productName = product?.name;
          const productCode = product?.code;

          console.log('Nombre:', productName, 'Código:', productCode);

          if (productCode && productName) {
            displayText = `${productCode} - ${productName}`;
          } else if (productName) {
            displayText = productName;
          } else if (productCode) {
            displayText = productCode;
          } else {
            displayText = `Producto ID: ${productId}`;
          }

          console.log('Texto a mostrar:', displayText);

          // Actualizar el campo de búsqueda con los datos reales
          this.form.patchValue({
            product_search: displayText
          });

          // Actualizar el costo unitario si está disponible en el producto
          const unitCost = product?.unit_cost ?? product?.price ?? product?.cost;
          if (unitCost) {
            this.form.patchValue({
              unit_cost: unitCost
            });
          }
        },
        error: (err) => {
          this.loadingProductDetails = false;
          console.error('Error cargando detalles del producto:', err);

          // Fallback: usar los datos disponibles en el movimiento
          const fallbackName = m?.product_name ?? m?.raw_material_name ?? '';
          const fallbackCode = m?.product_code ?? m?.raw_material_code ?? '';
          let fallbackText = '';

          console.log('Usando fallback - Nombre:', fallbackName, 'Código:', fallbackCode);

          if (fallbackCode && fallbackName) {
            fallbackText = `${fallbackCode} - ${fallbackName}`;
          } else if (fallbackName) {
            fallbackText = fallbackName;
          } else if (fallbackCode) {
            fallbackText = fallbackCode;
          } else {
            fallbackText = `Producto ID: ${productId}`;
          }

          this.form.patchValue({
            product_search: fallbackText
          });
        }
      });
    } else {
      // Si no hay productId, usar los datos disponibles en el movimiento
      console.log('No hay productId, usando datos del movimiento directamente');
      const fallbackName = m?.product_name ?? m?.raw_material_name ?? '';
      const fallbackCode = m?.product_code ?? m?.raw_material_code ?? '';
      let fallbackText = '';

      console.log('Datos directos - Nombre:', fallbackName, 'Código:', fallbackCode);

      if (fallbackCode && fallbackName) {
        fallbackText = `${fallbackCode} - ${fallbackName}`;
      } else if (fallbackName) {
        fallbackText = fallbackName;
      } else if (fallbackCode) {
        fallbackText = fallbackCode;
      } else {
        fallbackText = 'Producto sin identificar';
      }

      console.log('Texto fallback:', fallbackText);

      this.form.patchValue({
        product_search: fallbackText
      });
    }

    // Cargar las notas en los campos correspondientes
    const notes = m?.notes ?? '';
    this.parseAndLoadNotes(notes);

    this.showModal = true;
  }

  selectProduct(p: any): void {
    if (!p) return;
    // Establecer el ID del producto y el valor mostrado
    const productId = p.id ?? p?.product_id ?? null;
    const productName = p.name ?? p.product_name ?? '';
    const productCode = p.code ?? p.product_code ?? '';
    const unitCost = p.unit_cost ?? p.price ?? p.cost ?? 0;

    // Crear el texto de visualización con código y nombre
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
      unit_cost: unitCost,
      batch_id: null
    });
    this.productSuggestions = [];

    // Cargar batches disponibles si es una salida
    if (this.form.get('type')?.value === 'out') {
      this.loadBatchesForProduct(productId);
    }
  }

  private loadBatchesForProduct(productId: number): void {
    if (!productId) {
      this.availableBatches = [];
      return;
    }

    this.loadingBatches = true;

    // Usar el método del servicio para obtener batches del material
    this.invService.getBatchesByMaterial(productId).subscribe({
      next: (res: any) => {
        this.loadingBatches = false;
        this.availableBatches = res?.data ?? res ?? [];
      },
      error: (err) => {
        this.loadingBatches = false;
        console.error('Error cargando batches:', err);
        this.availableBatches = [];
      }
    });
  }

  openBatchSearchModal(): void {
    this.batchSearchPage = 1;
    this.resetBatchFilters();
    this.showBatchSearchModal = true;
    
    // Asegurar que las materias primas estén cargadas antes de cargar los movimientos
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
          // Continuar sin materias primas
          this.loadAllEntryMovements();
        }
      });
    } else {
      this.loadAllEntryMovements();
    }
  }

  closeBatchSearchModal(): void {
    this.showBatchSearchModal = false;
    this.batchSearchLoading = false;
  }

  /**
   * Carga TODOS los movimientos de entrada desde el API (sin filtro de fecha)
   * para mostrar en la modal de búsqueda de lotes
   */
  private loadAllEntryMovements(): void {
    // Si ya están cargados, usar los datos en caché
    if (this.allEntryMovementsLoaded && this.allEntryMovements.length > 0) {
      this.buildBatchSearchFromCache();
      return;
    }

    this.batchSearchLoading = true;

    // Cargar TODOS los movimientos de entrada sin filtro de fecha
    this.invService.listWithoutDate({ movement_type: 'in' }, 500, 1).subscribe({
      next: (res) => {
        const data = res?.data ?? [];
        // Enriquecer los datos con nombres de productos desde el mapa
        this.allEntryMovements = data.map((item: any) => this.enrichWithProductData(item));
        this.allEntryMovementsLoaded = true;
        this.buildBatchSearchFromCache();
      },
      error: (err) => {
        console.error('Error cargando movimientos de entrada:', err);
        // Fallback: usar los movimientos actuales filtrados (ya tienen los nombres)
        this.allEntryMovements = this.movements.filter((m: any) => {
          const type = (m?.type || m?.movement_type || '').toLowerCase();
          return type === 'in';
        });
        this.buildBatchSearchFromCache();
      }
    });
  }

  /**
   * Enriquece un movimiento con los datos del producto desde el mapa de materias primas
   */
  private enrichWithProductData(item: any): any {
    // Si ya tiene nombre de producto, devolverlo tal cual
    if (item?.product_name || item?.raw_material_name) {
      return item;
    }

    // Buscar en el mapa de materias primas
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

  /**
   * Construye la vista de búsqueda de lotes desde el caché de entradas
   */
  private buildBatchSearchFromCache(): void {
    const currentProductId = this.form.get('product_id')?.value;

    // Filtrar por producto si está seleccionado en el formulario
    let entryMovements = [...this.allEntryMovements];
    if (currentProductId) {
      entryMovements = entryMovements.filter((m: any) => {
        const prodId = m?.product_id ?? m?.raw_material_id;
        return Number(prodId) === Number(currentProductId);
      });
    }

    // Decorar cada fila con los datos parseados
    this.batchSearchResults = entryMovements.map((item: any) => this.decorateBatchRow(item));

    // Simular meta de paginación local
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

  /**
   * Fuerza la recarga de todos los movimientos de entrada desde el API
   */
  reloadBatchSearchData(): void {
    this.allEntryMovementsLoaded = false;
    this.allEntryMovements = [];
    // También recargar materias primas para tener datos frescos
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

    // Ordenar por fecha
    rows.sort((a, b) => {
      const dateA = new Date(a?.created_at || a?.updated_at || 0).getTime();
      const dateB = new Date(b?.created_at || b?.updated_at || 0).getTime();
      return this.batchSearchSort === 'desc' ? dateB - dateA : dateA - dateB;
    });

    // Actualizar meta con los filtrados
    const total = rows.length;
    this.batchSearchMeta = {
      total: total,
      per_page: this.batchSearchPerPage,
      current_page: this.batchSearchPage,
      last_page: Math.ceil(total / this.batchSearchPerPage) || 1
    };

    // Aplicar paginación local
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

  selectBatchFromModal(row: any): void {
    this.applyEntryDataToOut(row, row?.parsed?.batch ?? '');
    this.showBatchSearchModal = false;
  }

  prefillOutByBatch(): void {
    const batchInput = document.getElementById('batchOut') as HTMLInputElement;
    const batchCode = (batchInput?.value || '').trim();

    if (!batchCode) {
      this.alert.warning('Falta el lote', 'Ingresa el número de lote para buscar la entrada.');
      return;
    }

    this.loadingBatchLookup = true;

    // Intentar con los movimientos ya cargados primero (más rápido)
    const localEntry = this.findEntryByBatch(batchCode);
    if (localEntry) {
      this.applyEntryDataToOut(localEntry, batchCode);
      this.loadingBatchLookup = false;
      return;
    }

    // Si no está en memoria, consultar al backend filtrando por entrada y notas (sin forzar fecha)
    this.invService.listWithoutDate({ movement_type: 'in', notes: batchCode }, 50, 1).subscribe({
      next: (res) => {
        const entries = res?.data ?? [];
        const match = entries.find((item: any) => this.matchesBatch(item, batchCode));

        if (match) {
          this.applyEntryDataToOut(match, batchCode);
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

  private findEntryByBatch(batchCode: string): any | undefined {
    const target = (batchCode || '').trim().toLowerCase();
    if (!target) return undefined;

    return this.movements.find(movement => {
      const type = (movement?.type || movement?.movement_type || '').toLowerCase();
      if (type !== 'in') return false;

      const notesBatch = (this.parseNotesField(movement?.notes, 'Lote') || '').toLowerCase();
      const batchField = (movement?.batch_code || movement?.batch || '').toLowerCase();
      return notesBatch === target || batchField === target;
    });
  }

  private matchesBatch(movement: any, batchCode: string): boolean {
    const target = (batchCode || '').trim().toLowerCase();
    if (!target) return false;

    const notesBatch = (this.parseNotesField(movement?.notes, 'Lote') || '').trim().toLowerCase();
    const batchField = (movement?.batch_code || movement?.batch || '').toLowerCase();
    return notesBatch === target || batchField === target;
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
        el.classList.remove('is-invalid');
      }
    };

    setValue('supplierOut', supplier);
    setValue('expiryDateOut', expiryDate);
    setValue('sealsOut', seals);
    setValue('packageTypeOut', packageType);
    setValue('cleanPackageOut', cleanPackage);
    setValue('transportConditionsOut', transportConditions);
    setValue('acceptedOut', accepted);
    setValue('observationsOut', observations);
    setValue('batchOut', batch);
    setValue('receivedByOut', receivedBy);
    setValue('deliveredByOut', deliveredBy);

    const productId = entry?.raw_material_id ?? entry?.product_id ?? null;
    const productName = entry?.product_name ?? entry?.raw_material_name ?? '';
    const productCode = entry?.product_code ?? entry?.raw_material_code ?? '';
    const unitCost = entry?.unit_cost ?? entry?.price ?? entry?.cost ?? null;

    this.form.patchValue({
      type: 'out',
      product_id: productId ?? this.form.get('product_id')?.value,
      batch_id: entry?.batch_id ?? this.form.get('batch_id')?.value,
      unit_cost: unitCost ?? this.form.get('unit_cost')?.value,
      product_search: this.buildProductDisplay(productCode, productName) || this.form.get('product_search')?.value
    });

    this.updateNotesSummary();
    this.alert.success('Datos cargados', 'Se precargaron los datos de la entrada para la liberación.');
  }

  private buildProductDisplay(code?: string, name?: string): string {
    if (code && name) return `${code} - ${name}`;
    if (name) return name;
    if (code) return code;
    return '';
  }

  cancelModal(): void {
    this.showModal = false;
    this.productSuggestions = [];
    this.formError = null;
    this.loadingProductDetails = false;
  }

  /**
   * Parsea las notas guardadas y carga los datos en los campos
   */
  parseAndLoadNotes(notesText: string): void {
    const movementType = this.form.get('type')?.value;

    // Limpiar todos los campos primero
    setTimeout(() => {
      // Campos de ENTRADA - nuevos
      const sealsEl = document.getElementById('seals') as HTMLSelectElement;
      const packageTypeEl = document.getElementById('packageType') as HTMLSelectElement;
      const cleanPackageEl = document.getElementById('cleanPackage') as HTMLSelectElement;
      const transportConditionsEl = document.getElementById('transportConditions') as HTMLSelectElement;
      const acceptedEl = document.getElementById('accepted') as HTMLSelectElement;

      // Campos de ENTRADA - existentes
      const expiryDateEl = document.getElementById('expiryDate') as HTMLInputElement;
      const supplierEl = document.getElementById('supplier') as HTMLInputElement;
      const batchEl = document.getElementById('batch') as HTMLInputElement;
      const additionalNotesEl = document.getElementById('additionalNotes') as HTMLTextAreaElement;
      const receivedByEl = document.getElementById('receivedBy') as HTMLInputElement;
      const deliveredByEl = document.getElementById('deliveredBy') as HTMLInputElement;

      // Campos de SALIDA - nuevos
      const sealsOutEl = document.getElementById('sealsOut') as HTMLInputElement;
      const packageTypeOutEl = document.getElementById('packageTypeOut') as HTMLInputElement;
      const cleanPackageOutEl = document.getElementById('cleanPackageOut') as HTMLSelectElement;
      const transportConditionsOutEl = document.getElementById('transportConditionsOut') as HTMLSelectElement;
      const acceptedOutEl = document.getElementById('acceptedOut') as HTMLSelectElement;
      const observationsOutEl = document.getElementById('observationsOut') as HTMLTextAreaElement;
      const expiryDateOutEl = document.getElementById('expiryDateOut') as HTMLInputElement;
      const supplierOutEl = document.getElementById('supplierOut') as HTMLInputElement;
      const batchOutEl = document.getElementById('batchOut') as HTMLInputElement;
      const receivedByOutEl = document.getElementById('receivedByOut') as HTMLInputElement;
      const deliveredByOutEl = document.getElementById('deliveredByOut') as HTMLInputElement;

      // Campos de AJUSTE
      const adjustmentReasonEl = document.getElementById('adjustmentReason') as HTMLTextAreaElement;
      const adjustmentWhatEl = document.getElementById('adjustmentWhat') as HTMLTextAreaElement;

      // Limpiar todos
      if (sealsEl) sealsEl.value = '';
      if (packageTypeEl) packageTypeEl.value = '';
      if (cleanPackageEl) cleanPackageEl.value = '';
      if (transportConditionsEl) transportConditionsEl.value = '';
      if (acceptedEl) acceptedEl.value = '';
      if (sealsOutEl) sealsOutEl.value = '';
      if (packageTypeOutEl) packageTypeOutEl.value = '';
      if (cleanPackageOutEl) cleanPackageOutEl.value = '';
      if (transportConditionsOutEl) transportConditionsOutEl.value = '';
      if (acceptedOutEl) acceptedOutEl.value = '';
      if (observationsOutEl) observationsOutEl.value = '';
      if (expiryDateEl) expiryDateEl.value = '';
      if (expiryDateOutEl) expiryDateOutEl.value = '';
      if (supplierEl) supplierEl.value = '';
      if (supplierOutEl) supplierOutEl.value = '';
      if (batchEl) batchEl.value = '';
      if (batchOutEl) batchOutEl.value = '';
      if (additionalNotesEl) additionalNotesEl.value = '';
      if (receivedByEl) receivedByEl.value = '';
      if (deliveredByEl) deliveredByEl.value = '';
      if (receivedByOutEl) receivedByOutEl.value = '';
      if (deliveredByOutEl) deliveredByOutEl.value = '';
      if (adjustmentReasonEl) adjustmentReasonEl.value = '';
      if (adjustmentWhatEl) adjustmentWhatEl.value = '';

      if (!notesText) return;

      // Parsear el texto separado por pipes
      const parts = notesText.split(' | ');

      parts.forEach(part => {
        if (part.startsWith('Sellos:')) {
          const value = part.replace('Sellos:', '').trim();
          if (sealsEl) sealsEl.value = value;
          if (sealsOutEl) sealsOutEl.value = value;
        } else if (part.startsWith('Tipo de Empaque:')) {
          const value = part.replace('Tipo de Empaque:', '').trim();
          if (packageTypeEl) packageTypeEl.value = value;
          if (packageTypeOutEl) packageTypeOutEl.value = value;
        } else if (part.startsWith('Empaque Limpio:')) {
          const value = part.replace('Empaque Limpio:', '').trim();
          if (cleanPackageEl) cleanPackageEl.value = value;
          if (cleanPackageOutEl) cleanPackageOutEl.value = value;
        } else if (part.startsWith('Condiciones de Transporte:')) {
          const value = part.replace('Condiciones de Transporte:', '').trim();
          if (transportConditionsEl) transportConditionsEl.value = value;
          if (transportConditionsOutEl) transportConditionsOutEl.value = value;
        } else if (part.startsWith('Aceptado:')) {
          const value = part.replace('Aceptado:', '').trim();
          if (acceptedEl) acceptedEl.value = value;
          if (acceptedOutEl) acceptedOutEl.value = value;
        } else if (part.startsWith('Observaciones:')) {
          const value = part.replace('Observaciones:', '').trim();
          if (additionalNotesEl) additionalNotesEl.value = value;
          if (observationsOutEl) observationsOutEl.value = value;
        } else if (part.startsWith('Vencimiento:')) {
          const value = part.replace('Vencimiento:', 'NA').trim();
          if (expiryDateEl) expiryDateEl.value = value;
          if (expiryDateOutEl) expiryDateOutEl.value = value;
        } else if (part.startsWith('Proveedor:')) {
          const value = part.replace('Proveedor:', '').trim();
          if (supplierEl) supplierEl.value = value;
          if (supplierOutEl) supplierOutEl.value = value;
        } else if (part.startsWith('Lote:')) {
          const value = part.replace('Lote:', '').trim();
          if (batchEl) batchEl.value = value;
          if (batchOutEl) batchOutEl.value = value;
        } else if (part.startsWith('Recibido por:')) {
          const value = part.replace('Recibido por:', '').trim();
          if (receivedByEl) receivedByEl.value = value;
          if (receivedByOutEl) receivedByOutEl.value = value;
        } else if (part.startsWith('Entregado por:')) {
          const value = part.replace('Entregado por:', '').trim();
          if (deliveredByEl) deliveredByEl.value = value;
          if (deliveredByOutEl) deliveredByOutEl.value = value;
        } else if (part.startsWith('Motivo:')) {
          if (adjustmentReasonEl) adjustmentReasonEl.value = part.replace('Motivo:', '').trim();
        } else if (part.startsWith('Qué sucedió:')) {
          if (adjustmentWhatEl) adjustmentWhatEl.value = part.replace('Qué sucedió:', '').trim();
        }
      });

      this.updateNotesSummary();
    }, 100);
  }

  /**
   * Formatea los datos de los campos de notas en un texto organizado con guiones
   */
  formatNotesData(): string {
    const movementType = this.form.get('type')?.value;
    const parts: string[] = [];

    if (movementType === 'in') {
      // ENTRADA: Nuevos campos en orden
      const seals = (document.getElementById('seals') as HTMLSelectElement)?.value || '';
      const packageType = (document.getElementById('packageType') as HTMLSelectElement)?.value || '';
      const cleanPackage = (document.getElementById('cleanPackage') as HTMLSelectElement)?.value || '';
      const transportConditions = (document.getElementById('transportConditions') as HTMLSelectElement)?.value || '';
      const accepted = (document.getElementById('accepted') as HTMLSelectElement)?.value || '';
      const additionalNotes = (document.getElementById('additionalNotes') as HTMLTextAreaElement)?.value || '';
      const expiryDate = (document.getElementById('expiryDate') as HTMLInputElement)?.value || '';
      const supplier = (document.getElementById('supplier') as HTMLInputElement)?.value || '';
      const batch = (document.getElementById('batch') as HTMLInputElement)?.value || '';
      const receivedBy = (document.getElementById('receivedBy') as HTMLInputElement)?.value || '';
      const deliveredBy = (document.getElementById('deliveredBy') as HTMLInputElement)?.value || '';

      // Agregar en orden
      if (seals) parts.push(`Sellos: ${seals}`);
      if (packageType) parts.push(`Tipo de Empaque: ${packageType}`);
      if (cleanPackage) parts.push(`Empaque Limpio: ${cleanPackage}`);
      if (transportConditions) parts.push(`Condiciones de Transporte: ${transportConditions}`);
      if (accepted) parts.push(`Aceptado: ${accepted}`);
      if (additionalNotes) parts.push(`Observaciones: ${additionalNotes}`);
      if (expiryDate) parts.push(`Vencimiento: ${expiryDate}`);
      if (supplier) parts.push(`Proveedor: ${supplier}`);
      if (batch) parts.push(`Lote: ${batch}`);
      if (receivedBy) parts.push(`Recibido por: ${receivedBy}`);
      if (deliveredBy) parts.push(`Entregado por: ${deliveredBy}`);

    } else if (movementType === 'out') {
      // SALIDA: Mismos campos que entrada
      const seals = (document.getElementById('sealsOut') as HTMLInputElement)?.value || '';
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

      // Agregar en orden
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

    } else if (movementType === 'adjustment') {
      // AJUSTE: Por qué y qué sucedió
      const adjustmentReason = (document.getElementById('adjustmentReason') as HTMLTextAreaElement)?.value || '';
      const adjustmentWhat = (document.getElementById('adjustmentWhat') as HTMLTextAreaElement)?.value || '';

      if (adjustmentReason) parts.push(`Motivo: ${adjustmentReason}`);
      if (adjustmentWhat) parts.push(`Qué sucedió: ${adjustmentWhat}`);
    }

    return parts.length > 0 ? parts.join(' | ') : '';
  }

  /**
   * Actualiza el resumen visual de las notas
   */
  updateNotesSummary(): void {
    const formattedNotes = this.formatNotesData();
    const summaryElement = document.getElementById('notesSummary');
    const formattedNotesInput = document.getElementById('formattedNotes') as HTMLInputElement;

    if (summaryElement) {
      summaryElement.textContent = formattedNotes || 'Los datos aparecerán aquí organizados...';
    }

    if (formattedNotesInput) {
      formattedNotesInput.value = formattedNotes;
    }

    // Actualizar el valor en el formulario
    this.form.patchValue({ notes: formattedNotes });

    // Si el usuario llena campos, limpiar resaltados rojos
    this.clearInvalidIfFilled();

    // Si el campo era inválido y ahora tiene valor, reflejarlo también en el form error
    if (this.formError) {
      const remaining = this.validateNotesRequired();
      if (remaining.length === 0) {
        this.formError = null;
      }
    }
  }

  /**
   * Marca/Desmarca la fecha de vencimiento como 'NA' (no aplica) en el formulario y en el DOM.
   * Si ya está en 'NA' la limpia y habilita el input.
   */
  setExpiryDateNA(): void {
    try {
      // Determinar el tipo de movimiento y el campo objetivo (in/out)
      const movementType = this.form.get('type')?.value;
      const fieldId = movementType === 'out' ? 'expiryDateOut' : 'expiryDate';

      // Intentar obtener el elemento objetivo; si no existe, intentar el opuesto
      let el = document.getElementById(fieldId) as HTMLInputElement | null;
      if (!el) {
        const altId = movementType === 'out' ? 'expiryDate' : 'expiryDateOut';
        el = document.getElementById(altId) as HTMLInputElement | null;
        if (!el) return;
      }

      const isNA = el.getAttribute('data-na') === 'true' || (el.value || '').toUpperCase() === 'NA';
      if (!isNA) {
        // Marcar como NA y deshabilitar la edición
        el.value = 'NA';
        el.setAttribute('data-na', 'true');
        el.disabled = true;
      } else {
        // Restaurar a vacío y habilitar
        el.value = '';
        el.removeAttribute('data-na');
        el.disabled = false;
      }

      // Quitar clase de error si corresponde y actualizar el resumen de notas
      try { el.classList.remove('is-invalid'); } catch (e) { /* noop */ }
      this.updateNotesSummary();
    } catch (err) {
      console.error('setExpiryDateNA error:', err);
    }
  }

  private requiredFieldsByType(): { id: string; label: string }[] {
    const movementType = this.form.get('type')?.value;
    const requiredIn = [
      { id: 'batch', label: 'Lote' },
      { id: 'supplier', label: 'Proveedor' },
      { id: 'expiryDate', label: 'Fecha de Vencimiento' },
      { id: 'seals', label: 'Sellos' },
      { id: 'packageType', label: 'Tipo de Empaque' },
      { id: 'cleanPackage', label: 'Empaque Limpio' },
      { id: 'transportConditions', label: 'Condiciones de Transporte' },
      { id: 'accepted', label: 'Aceptado' },
      { id: 'receivedBy', label: 'Recepcionista' },
      { id: 'deliveredBy', label: 'Quién Entrega' }
    ];

    const requiredOut = [
      { id: 'batchOut', label: 'Lote (Detalle)' },
      { id: 'supplierOut', label: 'Proveedor' },
      { id: 'expiryDateOut', label: 'Fecha de Vencimiento' },
      { id: 'sealsOut', label: 'Sellos' },
      { id: 'packageTypeOut', label: 'Tipo de Empaque' },
      { id: 'cleanPackageOut', label: 'Empaque Limpio' },
      { id: 'transportConditionsOut', label: 'Condiciones de Transporte' },
      { id: 'acceptedOut', label: 'Aceptado' },
      { id: 'receivedByOut', label: 'Quién Recibió' },
      { id: 'deliveredByOut', label: 'Quién Entrega' }
    ];

    return movementType === 'out' ? requiredOut : movementType === 'in' ? requiredIn : [];
  }

  private clearInvalidIfFilled(): void {
    this.requiredFieldsByType().forEach(field => {
      const el = document.getElementById(field.id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      if (!el) return;
      const raw = (el.value || '').toString();
      const v = raw.trim();
      const isNA = el.getAttribute('data-na') === 'true' || v.toUpperCase() === 'NA';
      if (v || isNA) {
        el.classList.remove('is-invalid');
      }
    });
  }

  private validateNotesRequired(): string[] {
    const missing: string[] = [];
    let firstMissingEl: HTMLElement | null = null;

    this.requiredFieldsByType().forEach(field => {
      const el = document.getElementById(field.id) as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement | null;
      const raw = (el?.value ?? '').toString();
      const value = raw.trim();
      const isNA = el?.getAttribute('data-na') === 'true' || (value && value.toUpperCase() === 'NA');
      const isMissing = !value && !isNA;
      if (el) {
        el.classList.toggle('is-invalid', isMissing);
        if (isMissing && !firstMissingEl) {
          firstMissingEl = el;
        }
      }
      if (isMissing) {
        missing.push(field.label);
      }
    });

    // Enfocar y desplazar al primer faltante para guiar al usuario
    if (firstMissingEl) {
      setTimeout(() => {
        firstMissingEl?.focus({ preventScroll: false });
        firstMissingEl?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
    }

    return missing;
  }

  submit(): void {
    this.formError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Corrige los errores del formulario.';
      return;
    }

    const missingNotes = this.validateNotesRequired();
    if (missingNotes.length > 0) {
      this.formError = `Completa los campos: ${missingNotes.join(', ')}`;
      this.alert.warning('Faltan datos', this.formError);
      return;
    }

    const formValue = { ...this.form.value };
    const id = formValue.id;
    const movementType = formValue.type;

    // Generar las notas formateadas
    const formattedNotes = this.formatNotesData();

    // Preparar payload con la estructura esperada por el backend
    const payload: any = {
      raw_material_id: formValue.product_id,
      batch_id: formValue.batch_id || null,
      movement_type: movementType,
      quantity: formValue.quantity,
      unit_cost: formValue.unit_cost,
      production_line: formValue.production_line || null,
      notes: formattedNotes // Incluir las notas formateadas
    };

    console.log('Payload enviado:', payload);

    this.loading = true;
    const obs = this.isEditing && id ? this.invService.update(id, payload) : this.invService.create(payload);
    obs.subscribe({
      next: (res) => {
        this.loading = false;

        // Verificar éxito del backend
        if (res?.success) {
          this.showModal = false;
          this.loadMovements();
          // Refrescar lotes pendientes después de un movimiento exitoso
          this.refreshAfterRelease();
          // Mostrar mensaje de éxito si está disponible
          if (res.message) {
            try { this.alert.success('Éxito', res.message); } catch (e) { /* noop */ }
          } else {
            try { this.alert.success('Éxito', 'Movimiento procesado correctamente'); } catch (e) { /* noop */ }
          }
        } else {
          // El backend devolvió success: false
          this.formError = res?.message || 'Error procesando la solicitud';
        }
      },
      error: (err) => {
        this.loading = false;
        // Manejar errores del backend
        if (err?.error?.errors) {
          // Manejar errores de validación específicos
          const errors = err.error.errors;
          const errorMessages = [];

          if (errors.raw_material_id) {
            errorMessages.push('• ' + errors.raw_material_id[0]);
          }
          if (errors.movement_type) {
            errorMessages.push('• ' + errors.movement_type[0]);
          }
          if (errors.unit_cost) {
            errorMessages.push('• ' + errors.unit_cost[0]);
          }
          if (errors.quantity) {
            errorMessages.push('• ' + errors.quantity[0]);
          }

          this.formError = errorMessages.length > 0
            ? 'Errores de validación:\n' + errorMessages.join('\n')
            : 'Error de validación en el formulario';
          try { this.alert.error('Error de validación', this.formError ?? undefined); } catch (e) { /* noop */ }
        } else if (err?.error?.message) {
          this.formError = err.error.message;
          try { this.alert.error('Error', this.formError ?? undefined); } catch (e) { /* noop */ }
        } else if (err?.message) {
          this.formError = err.message;
          try { this.alert.error('Error', this.formError ?? undefined); } catch (e) { /* noop */ }
        } else {
          this.formError = 'Error enviando datos al servidor';
          try { this.alert.error('Error', this.formError ?? undefined); } catch (e) { /* noop */ }
        }
      }
    });
  }

  // Simple pagination handlers
  prevPage(): void {
    if (this.page > 1) {
      this.page--;
      this.loadMovements();
    }
  }

  nextPage(): void {
    const last = this.meta?.last_page ?? null;
    if (!last || this.page < last) {
      this.page++;
      this.loadMovements();
    }
  }

  /**
   * Genera un reporte de movimientos de inventario con columnas organizadas
   * @param format Formato del reporte: pdf, csv, xlsx o html
   */
  generateReport(format: 'pdf' | 'csv' | 'xlsx' | 'html'): void {
    console.log('generateReport llamado con formato:', format);
    console.log('Movimientos disponibles:', this.movements?.length || 0);

    if (!this.movements || this.movements.length === 0) {
      console.warn('No hay movimientos para generar reporte');
      this.alert.warning('Sin datos', 'No hay movimientos para generar el reporte.');
      return;
    }

    this.generatingReport = true;
    console.log('generatingReport set to true');

    // Preparar datos con campos separados pero sin romper el PDF
    const reportData = {
      title: 'Reporte de Movimientos de Inventario',
      headings: [
        'ID',
        'Tipo',
        'Línea',
        'Recepciona',
        'Entrega',
        'Nombre del Producto',
        'Proveedor',
        'Cantidad',
        'Lote',
        'Fecha de Vencimiento',
        'Sellos',
        'Tipo de Empaque',
        'Empaque Limpio',
        'Condiciones de Transporte',
        'Aceptado',
        'Observaciones',
        'Fecha'
      ],
      rows: this.movements.map(movement => [
        movement.id?.toString() || '',
        this.getMovementTypeText(movement),
        movement.production_line?.toString() || '—',
        (this.parseNotesField(movement.notes, 'Recibido por') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Entregado por') || '—').toString(),
        (movement.product_name || movement.raw_material_name || 'Sin especificar').toString(),
        (this.parseNotesField(movement.notes, 'Proveedor') || '—').toString(),
        movement.quantity?.toString() || '0',
        (this.parseNotesField(movement.notes, 'Lote') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Vencimiento') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Sellos') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Tipo de Empaque') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Empaque Limpio') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Condiciones de Transporte') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Aceptado') || '—').toString(),
        (this.parseNotesField(movement.notes, 'Observaciones') || '—').toString(),
        movement.created_at ? new Date(movement.created_at).toLocaleDateString('es-ES') : 'Sin fecha'
      ]),
      format: format
    };

    console.log('Report data prepared:', reportData);

    this.reportService.generateReport(reportData).subscribe({
      next: (blob) => {
        console.log('Reporte recibido, tamaño:', blob.size);
        this.generatingReport = false;

        // Generar nombre de archivo con timestamp
        const timestamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, '_');
        const filename = `movimientos_inventario_${timestamp}.${format === 'xlsx' ? 'xlsx' : format}`;

        console.log('Descargando archivo:', filename);
        // Descargar archivo
        this.reportService.downloadFile(blob, filename);

        this.alert.success(
          'Reporte generado',
          `El reporte en formato ${format.toUpperCase()} se ha descargado correctamente.`
        );
      },
      error: (error) => {
        console.error('Error en generateReport:', error);
        this.generatingReport = false;

        let errorMessage = 'Error desconocido al generar el reporte.';

        // Manejo de errores específicos
        if (error.status === 401) {
          errorMessage = 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente.';
        } else if (error.status === 403) {
          errorMessage = 'No tienes permisos para generar reportes. Contacta al administrador.';
        } else if (error.status === 422) {
          errorMessage = 'Los datos enviados no son válidos para generar el reporte.';
        } else if (error.status === 0) {
          errorMessage = 'No se puede conectar al servidor. Verifica tu conexión a internet.';
        } else if (error.message) {
          errorMessage = error.message;
        }

        console.error('Mensaje de error:', errorMessage);
        this.alert.error('Error al generar reporte', errorMessage);
      }
    });
  }

  /**
   * Convierte el tipo de movimiento a texto legible
   * @param movement Objeto del movimiento
   * @returns Texto descriptivo del tipo de movimiento
   */
  private getMovementTypeText(movement: any): string {
    const type = (movement?.type || movement?.movement_type)?.toLowerCase();
    switch (type) {
      case 'in':
        return 'Entrada';
      case 'out':
        return 'Salida';
      case 'adjustment':
        return 'Ajuste';
      default:
        return 'No definido';
    }
  }

  /**
   * Extrae una lista de detalles validados de las notas
   */
  getDetailsList(notes: string): { label: string; value: string }[] {
    if (!notes) return [];

    const details: { label: string; value: string }[] = [];

    // Campos de entrada en orden
    const entryFields = [
      'Sellos',
      'Tipo de Empaque',
      'Empaque Limpio',
      'Condiciones de Transporte',
      'Aceptado',
      'Observaciones'
    ];

    // Otros campos importantes
    const otherFields = [
      'Vencimiento',
      'Proveedor',
      'Lote',
      'Recibido por',
      'Entregado por',
      'Detalles',
      'Motivo',
      'Qué sucedió'
    ];

    // Extraer campos de entrada primero
    entryFields.forEach(field => {
      const value = this.parseNotesField(notes, field);
      if (value) {
        details.push({ label: field, value });
      }
    });

    // Luego otros campos
    otherFields.forEach(field => {
      const value = this.parseNotesField(notes, field);
      if (value) {
        details.push({ label: field, value });
      }
    });

    return details;
  }

  /**
   * Formatea una lista de detalles para mostrar en tooltip
   */
  formatTooltip(detalles: { label: string; value: string }[]): string {
    if (!detalles || detalles.length === 0) return '';
    return detalles
      .map((d, idx) => `${idx + 1}. ${d.label}: ${d.value}`)
      .join('\n');
  }

  /**
   * Muestra el modal de detalles con la lista ordenada
   */
  openDetailsModal(detalles: { label: string; value: string }[]): void {
    this.currentDetailsModal = detalles;
    this.showDetailsModalFlag = true;
  }

  /**
   * Cierra el modal de detalles
   */
  closeDetailsModal(): void {
    this.showDetailsModalFlag = false;
    this.currentDetailsModal = [];
  }

  /**
   * total de cantidades de movimientos
   */
  get totalQuantities(): { in: number; out: number; adjustment: number } {
    let totalIn = 0;
    let totalOut = 0;
    let totalAdjustment = 0;

    this.movements.forEach(movement => {
      const type = (movement?.type || movement?.movement_type)?.toLowerCase();
      const quantity = Number(movement?.quantity) || 0;

      if (type === 'in') {
        totalIn += quantity;
      } else if (type === 'out') {
        totalOut += quantity;
      } else if (type === 'adjustment') {
        totalAdjustment += quantity;
      }
    });

    return {
      in: totalIn,
      out: totalOut,
      adjustment: totalAdjustment
    };
  }

  /**
   * Suma las cantidades aplicando los filtros actuales o los sobrescritos.
   * @param overrideFilters Filtros parciales ({ type, date, product, production_line, general })
   */
  sumQuantitiesByFilters(overrideFilters?: Partial<{ type: string; date: string; product: string | number; production_line: string; general: string }>): { in: number; out: number; adjustment: number; total: number } {
    const f = { ...this.filters, ...(overrideFilters || {}) } as any;

    const norm = (v: any) => (v === null || v === undefined) ? '' : String(v).toLowerCase();

    let totalIn = 0;
    let totalOut = 0;
    let totalAdjustment = 0;

    (this.movements || []).forEach(movement => {
      const type = norm(movement?.type || movement?.movement_type);

      // filtro por tipo
      if (f.type && type !== norm(f.type)) return;

      // filtro por fecha (comparar YYYY-MM-DD)
      if (f.date) {
        const created = (movement?.created_at || movement?.updated_at || '').toString().slice(0, 10);
        if (created !== f.date) return;
      }

      // filtro por linea de producción
      if (f.production_line && norm(movement?.production_line) !== norm(f.production_line)) return;

      // filtro por producto (comparar id)
      if (f.product) {
        const pid = movement?.raw_material_id ?? movement?.product_id;
        if (String(pid) !== String(f.product)) return;
      }

      // filtro general (busca en notas, nombre o codigo)
      if (f.general) {
        const haystack = [movement?.notes, movement?.product_name, movement?.product_code, movement?.raw_material_name, movement?.raw_material_code]
          .map(x => norm(x || ''))
          .join(' ');
        if (!haystack.includes(norm(f.general))) return;
      }

      const qty = Number(movement?.quantity) || 0;
      if (type === 'in') totalIn += qty;
      else if (type === 'out') totalOut += qty;
      else if (type === 'adjustment') totalAdjustment += qty;
    });

    return { in: totalIn, out: totalOut, adjustment: totalAdjustment, total: totalIn - totalOut + totalAdjustment };
  }

  // ============================================================================
  // Material Release Automation - Liberación de materias primas para lotes
  // ============================================================================

  /**
   * Carga los lotes pendientes de liberación de materias primas
   */
  loadPendingReleaseBatches(): void {
    this.releaseLoading = true;
    console.log('[RELEASE] Iniciando carga de lotes pendientes...');
    
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
        },
        error: (err) => {
          console.error('[RELEASE] Error cargando lotes:', err);
          this.alert.error('Error', 'No se pudieron cargar los lotes pendientes');
        }
      });
  }

  /**
   * Abre el modal de liberación prellenado con los datos del material
   */
  openReleaseForMaterial(batch: PendingReleaseBatch, material: MaterialRequirement): void {
    console.log('[RELEASE] Abriendo modal para material:', material.rawMaterialName, 'lote:', batch.batch?.id);
    
    // Marcar que estamos liberando este material
    this.releasingMaterial = { batchId: batch.batch?.id || 0, materialId: material.rawMaterialId };
    
    // Resetear y configurar el formulario
    this.isEditing = false;
    this.formError = null;
    this.productSuggestions = [];
    this.availableBatches = [];
    
    // Prellenar el formulario con los datos del material
    this.form.reset({
      id: null,
      type: 'out', // Salida (liberación)
      product_id: material.rawMaterialId,
      product_search: `${material.rawMaterialCode || ''} ${material.rawMaterialName}`.trim(),
      batch_id: batch.batch?.id, // Vincular al lote de producción
      quantity: material.totalQuantityNeeded,
      unit_cost: 0, // Se puede actualizar si hay costo
      production_line: this.productionLines[0] || 'Producción General',
      notes: `Liberación automática para lote #${batch.batch?.id} - ${batch.product?.name} (${batch.batch?.quantity ?? 0} unidades)`
    });
    
    // Cargar el costo unitario del material si está disponible
    if (material.rawMaterialId) {
      this.rawService.getById(material.rawMaterialId).subscribe({
        next: (response: any) => {
          const product = response?.data ?? response;
          const unitCost = product?.unit_cost ?? product?.price ?? product?.cost ?? 0;
          if (unitCost) {
            this.form.patchValue({ unit_cost: unitCost });
          }
        },
        error: () => {
          // No es crítico, continuar sin costo
        }
      });
    }
    
    // Abrir el modal
    this.showModal = true;
  }

  /**
   * Verifica si un material específico está siendo liberado
   */
  isReleasingMaterial(batchId: number, materialId: number): boolean {
    return this.releasingMaterial?.batchId === batchId && 
           this.releasingMaterial?.materialId === materialId;
  }

  /**
   * Verifica si un material ya fue liberado para un lote específico
   */
  isMaterialReleased(batchId: number, materialId: number): boolean {
    return this.releasedMaterials.has(`${batchId}-${materialId}`);
  }

  /**
   * Refresca los lotes pendientes después de una liberación exitosa
   */
  refreshAfterRelease(): void {
    // Marcar el material como liberado si había uno en proceso
    if (this.releasingMaterial) {
      const key = `${this.releasingMaterial.batchId}-${this.releasingMaterial.materialId}`;
      this.releasedMaterials.add(key);
      console.log('[RELEASE] Material marcado como liberado:', key);
    }
    this.releasingMaterial = null;
    this.loadPendingReleaseBatches();
  }
}
