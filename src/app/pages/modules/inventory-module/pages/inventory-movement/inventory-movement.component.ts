import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryMovementService } from '../../services/inventory-movement.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { Subject, Subscription, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
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
  loading = false;
  error: string | null = null;
  page = 1;
  perPage = 15;
  meta: any = null;
  hasActiveFilters = false;

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
  // Product search
  productSuggestions: any[] = [];
  private productSearch$ = new Subject<string>();
  private productSearchSub: Subscription | null = null;
  private productSearchControlSub: Subscription | null = null;
  private cachedProducts: any[] = [];
  private productsCached = false;
  // Batches
  availableBatches: any[] = [];
  loadingBatches = false;

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
    private reportService: ReportService
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

          // Si no hay caché, obtener productos del servidor
          return this.rawService.list({}, 1, 100).pipe(
            map((res: any) => {
              // Guardar en caché
              this.cachedProducts = res?.data || [];
              this.productsCached = true;

              // Filtrar manualmente los resultados que contengan el término
              const filteredData = this.cachedProducts.filter((item: any) => {
                const name = (item?.name || '').toLowerCase();
                const code = (item?.code || '').toLowerCase();
                const searchTerm = term.toLowerCase();
                return name.includes(searchTerm) || code.includes(searchTerm);
              });
              return { data: filteredData.slice(0, 10), meta: res?.meta };
            }),
            catchError((error) => {
              console.error('Error searching products:', error);
              return of({ data: [], meta: null });
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
  }

  // Limpiar caché de productos si es necesario
  clearProductCache(): void {
    this.cachedProducts = [];
    this.productsCached = false;
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
  this.hasActiveFilters = false;
  this.page = 1;
  this.loadMovements();
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

    // Cargar detalles de productos en paralelo usando forkJoin
    const productCalls = productIds.map(id =>
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

    // Usar forkJoin para esperar todas las llamadas
    forkJoin(productCalls).subscribe({
      next: (products) => {
        console.log('Detalles de productos cargados:', products);

        // Crear un mapa para búsqueda rápida
        const productMap = new Map(products.map(p => [p.id, p]));

        // Actualizar movimientos con detalles de productos
        this.movements = this.movements.map(movement => {
          const productId = movement?.raw_material_id ?? movement?.product_id;
          const productDetails = productMap.get(productId);

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

        console.log('Movimientos actualizados con detalles de productos:', this.movements);
        this.loading = false;
      },
      error: (error) => {
        console.error('Error cargando detalles de productos:', error);
        this.loading = false;
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
      // Campos de ENTRADA
      const expiryDateEl = document.getElementById('expiryDate') as HTMLInputElement;
      const supplierEl = document.getElementById('supplier') as HTMLInputElement;
      const batchEl = document.getElementById('batch') as HTMLInputElement;
      const purchaseRefEl = document.getElementById('purchaseRef') as HTMLInputElement;
      const additionalNotesEl = document.getElementById('additionalNotes') as HTMLTextAreaElement;

      // Campos de SALIDA
      const receivedByEl = document.getElementById('receivedBy') as HTMLInputElement;
      const outDetailsEl = document.getElementById('outDetails') as HTMLTextAreaElement;

      // Campos de AJUSTE
      const adjustmentReasonEl = document.getElementById('adjustmentReason') as HTMLTextAreaElement;
      const adjustmentWhatEl = document.getElementById('adjustmentWhat') as HTMLTextAreaElement;

      // Limpiar todos
      if (expiryDateEl) expiryDateEl.value = '';
      if (supplierEl) supplierEl.value = '';
      if (batchEl) batchEl.value = '';
      if (purchaseRefEl) purchaseRefEl.value = '';
      if (additionalNotesEl) additionalNotesEl.value = '';
      if (receivedByEl) receivedByEl.value = '';
      if (outDetailsEl) outDetailsEl.value = '';
      if (adjustmentReasonEl) adjustmentReasonEl.value = '';
      if (adjustmentWhatEl) adjustmentWhatEl.value = '';

      if (!notesText) return;

      // Parsear el texto separado por pipes
      const parts = notesText.split(' | ');
      
      parts.forEach(part => {
        if (part.startsWith('Vencimiento:')) {
          if (expiryDateEl) expiryDateEl.value = part.replace('Vencimiento:', '').trim();
        } else if (part.startsWith('Proveedor:')) {
          if (supplierEl) supplierEl.value = part.replace('Proveedor:', '').trim();
        } else if (part.startsWith('Lote:')) {
          if (batchEl) batchEl.value = part.replace('Lote:', '').trim();
        } else if (part.startsWith('Referencia:')) {
          if (purchaseRefEl) purchaseRefEl.value = part.replace('Referencia:', '').trim();
        } else if (part.startsWith('Notas:')) {
          if (additionalNotesEl) additionalNotesEl.value = part.replace('Notas:', '').trim();
        } else if (part.startsWith('Recibido por:')) {
          if (receivedByEl) receivedByEl.value = part.replace('Recibido por:', '').trim();
        } else if (part.startsWith('Detalles:')) {
          if (outDetailsEl) outDetailsEl.value = part.replace('Detalles:', '').trim();
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
      // ENTRADA: Vencimiento, Proveedor, Lote, Referencia
      const expiryDate = (document.getElementById('expiryDate') as HTMLInputElement)?.value || '';
      const supplier = (document.getElementById('supplier') as HTMLInputElement)?.value || '';
      const batch = (document.getElementById('batch') as HTMLInputElement)?.value || '';
      const purchaseRef = (document.getElementById('purchaseRef') as HTMLInputElement)?.value || '';
      const additionalNotes = (document.getElementById('additionalNotes') as HTMLTextAreaElement)?.value || '';

      if (expiryDate) parts.push(`Vencimiento: ${expiryDate}`);
      if (supplier) parts.push(`Proveedor: ${supplier}`);
      if (batch) parts.push(`Lote: ${batch}`);
      if (purchaseRef) parts.push(`Referencia: ${purchaseRef}`);
      if (additionalNotes) parts.push(`Notas: ${additionalNotes}`);

    } else if (movementType === 'out') {
      // SALIDA: Quién recibió y detalles
      const receivedBy = (document.getElementById('receivedBy') as HTMLInputElement)?.value || '';
      const outDetails = (document.getElementById('outDetails') as HTMLTextAreaElement)?.value || '';

      if (receivedBy) parts.push(`Recibido por: ${receivedBy}`);
      if (outDetails) parts.push(`Detalles: ${outDetails}`);

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
  }

  submit(): void {
    this.formError = null;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.formError = 'Corrige los errores del formulario.';
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
   * Genera un reporte de movimientos de inventario
   * @param format Formato del reporte: pdf, csv, excel o html
   */
  generateReport(format: 'pdf' | 'csv' | 'excel' | 'html'): void {
    console.log('generateReport llamado con formato:', format);
    console.log('Movimientos disponibles:', this.movements?.length || 0);
    
    if (!this.movements || this.movements.length === 0) {
      console.warn('No hay movimientos para generar reporte');
      this.alert.warning('Sin datos', 'No hay movimientos para generar el reporte.');
      return;
    }

    this.generatingReport = true;
    console.log('generatingReport set to true');

    // Preparar datos con columnas expandidas para los campos de notas parseados
    const reportData = {
      title: 'Reporte de Movimientos de Inventario',
      headings: [
        'ID',
        'Tipo de Movimiento',
        'Producto/Materia Prima',
        'Cantidad',
        'Línea de Producción',
        'Vencimiento',
        'Proveedor',
        'Lote',
        'Referencia',
        'Recibido por',
        'Detalles',
        'Fecha'
      ],
      rows: this.movements.map(movement => [
        movement.id?.toString() || '',
        this.getMovementTypeText(movement),
        movement.product_name || movement.raw_material_name || 'Sin especificar',
        movement.quantity?.toString() || '0',
        movement.production_line || '—',
        this.parseNotesField(movement.notes, 'Vencimiento') || '—',
        this.parseNotesField(movement.notes, 'Proveedor') || '—',
        this.parseNotesField(movement.notes, 'Lote') || '—',
        this.parseNotesField(movement.notes, 'Referencia') || '—',
        this.parseNotesField(movement.notes, 'Recibido por') || '—',
        this.parseNotesField(movement.notes, 'Detalles') || '—',
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
        const filename = `movimientos_inventario_${timestamp}.${format === 'excel' ? 'xlsx' : format}`;
        
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

}
