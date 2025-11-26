import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryMovementService } from '../../services/inventory-movement.service';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { Subject, Subscription, of, forkJoin } from 'rxjs';
import { debounceTime, distinctUntilChanged, switchMap, catchError, map } from 'rxjs/operators';
import { AlertService } from 'src/app/core/services/alert.service';


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

  filters = {
  type: '',
  date: '',
  product: '',
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
  // Product search
  productSuggestions: any[] = [];
  private productSearch$ = new Subject<string>();
  private productSearchSub: Subscription | null = null;
  private productSearchControlSub: Subscription | null = null;
  private cachedProducts: any[] = [];
  private productsCached = false;

  constructor(
    private invService: InventoryMovementService,
    private fb: FormBuilder,
    private rawService: RawMaterialsService,
    private alert: AlertService
  ) {
    this.form = this.fb.group({
      id: [null],
      type: ['in', [Validators.required]],
      product_id: [null, [Validators.required]],
      product_search: [''],
      quantity: [1, [Validators.required, Validators.min(1)]],
      unit_cost: [0, [Validators.required, Validators.min(0)]],
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
  if (this.filters.date) filters.date = this.filters.date;
  if (this.filters.product) filters.raw_material_id = this.filters.product;
  if (this.filters.general) filters.search = this.filters.general;

  this.loading = true;

  this.invService.list(filters, this.perPage, this.page).subscribe({
    next: (res) => {
      this.movements = res.data || [];
      this.meta = res.meta || null;
      this.loading = false;
    },
    error: (err) => {
      this.loading = false;
      this.error = err?.error?.message || 'Error cargando movimientos';
    }
  });
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
    this.form.reset({ type: 'in', quantity: 1, product_id: null, product_search: '', unit_cost: 0, notes: '' });
    this.formError = null;
    this.productSuggestions = [];
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
      quantity: m?.quantity ?? 1,
      unit_cost: m?.unit_cost ?? 0,
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
      unit_cost: unitCost
    });
    this.productSuggestions = [];
  }

  cancelModal(): void {
    this.showModal = false;
    this.productSuggestions = [];
    this.formError = null;
    this.loadingProductDetails = false;
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

    // Preparar payload eliminando campos innecesarios
    const payload = {
      movement_type: formValue.type,
      raw_material_id: formValue.product_id,
      quantity: formValue.quantity,
      unit_cost: formValue.unit_cost,
      notes: formValue.notes || ''
    };

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


  // metodo para filtrar los movimientos de inventario segun
  // filterMovements(filters: Record<string, any>): void {
  //   // usar el metodo list del servicio pasando los filtros por parametro
  //   // ejemplo: { movement_type: 'in' | 'out' | 'adjustment' }
  //   // ejemplo materia prima por id: { raw_material_id: '1' }
  // }}


}
