import { Component, effect, signal, Signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductsService } from '../../services/products.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Product, PaginationMeta } from '../../models/product.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products-list.component.html'
})
export class ProductsListComponent implements OnInit, OnDestroy {
  // Estados con Signals (Angular 17)
  products = signal<Product[]>([]);
  selected = signal<Product | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  perPage = signal(10);
  filters = signal<Record<string, any>>({});
  meta = signal<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  showForm = signal(false);

  // Formulario reactivo para crear/editar
  form: FormGroup;
  // Formulario de filtros
  filterForm: FormGroup;

  private service: ProductsService;
  private alert: AlertService;
  private authService: AuthenticationService;
  private destroy$ = new Subject<void>();

  constructor(private fb: FormBuilder, productsService: ProductsService, alertService: AlertService, authService: AuthenticationService) {
    this.service = productsService;
    this.alert = alertService;
    this.authService = authService;
    this.form = this.buildForm();
    this.filterForm = this.buildFilterForm();
    
    // Cargar lista cada vez que cambie la página, el tamaño de página o los filtros.
    effect(() => {
      const p = this.page();
      const pp = this.perPage();
      const f = this.filters();
      this.loadList(f, p, pp);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // La carga inicial es manejada por el effect.
  }

  // trackBy para ngFor
  trackById(index: number, item: Product) {
    return item?.id ?? index;
  }

  openCreate() {
    const currentUser = this.authService.currentUserValue;
    const createdBy = currentUser?.id?.toString() || currentUser?.name || 'system';
    this.form.reset({ is_active: true, unit_price: 0, created_by: createdBy });
    this.selected.set(null);
    this.showForm.set(true);
  }

  forceReload() {
    this.loadList(this.filters(), this.page(), this.perPage());
  }

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      name: [''],
      code: [''],
      category: [''],
      low_stock: [false],
    });
  }

  applyFilters() {
    const raw = this.filterForm.value as any;
    const filters: Record<string, any> = {};
    if (raw.name) filters['name'] = raw.name;
    if (raw.code) filters['code'] = raw.code;
    if (raw.category) filters['category'] = raw.category;
    if (raw.low_stock) filters['low_stock'] = true;
    
    this.page.set(1); // Reset to first page when applying filters
    this.filters.set(filters);
  }

  clearFilters() {
    this.filterForm.reset();
    this.page.set(1);
    this.filters.set({});
  }

  private buildForm(): FormGroup {
    // Obtener el usuario actual para created_by
    const currentUser = this.authService.currentUserValue;
    const createdBy = currentUser?.id?.toString() || currentUser?.name || 'system';
    
    return this.fb.group({
      id: [null],
      name: ['', [Validators.required]],
      code: [''],
      description: [''],
      category: [''],
      specifications: [''], // String que será convertido a array al guardar
      unit_price: [0, [Validators.required, Validators.min(0)]],
      is_active: [true],
      created_by: [createdBy, [Validators.required]]
    });
  }

  loadList(filters: Record<string, any> = {}, page: number, perPage: number) {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .list(filters, page, perPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products.set(res.data || []);
          this.meta.set(res.meta || { current_page: 1, last_page: 1, per_page: perPage, total: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          const message = err?.message || 'Ocurrió un error desconocido.';
          this.error.set(message);
          this.alert.error('Error cargando productos', message);
          this.loading.set(false);
        }
      });
  }

  select(product: Product | null) {
    this.selected.set(product);
    if (product) {
      this.form.patchValue(product);
      this.showForm.set(true);
    } else {
      this.form.reset({ is_active: true, unit_price: 0 });
      this.showForm.set(false);
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value as Partial<Product>;
    
    // Procesar especificaciones: convertir string a array
    if (typeof payload.specifications === 'string') {
      const specs = (payload.specifications as any as string).trim();
      payload.specifications = specs ? specs.split(',').map(s => s.trim()).filter(s => s.length > 0) : [];
    } else if (!Array.isArray(payload.specifications)) {
      payload.specifications = [];
    }
    
    // Asegurar que created_by nunca sea null
    if (!payload.created_by) {
      const currentUser = this.authService.currentUserValue;
      (payload as any).created_by = currentUser?.id?.toString() || currentUser?.name || 'system';
    }

    this.loading.set(true);
    this.error.set(null);

    const operation$ = payload.id 
      ? this.service.update(payload.id, payload)
      : this.service.create(payload);

    operation$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (result) => {
        this.alert.success(payload.id ? 'Actualizado' : 'Creado', `El producto se ${payload.id ? 'actualizó' : 'creó'} correctamente.`);
        this.select(null); // Cierra el modal y resetea el form
        this.loading.set(false);
        // El effect se encargará de recargar la lista si es necesario,
        // pero forzamos una recarga en la página actual para ver el cambio.
        this.loadList(this.filters(), this.page(), this.perPage());
      },
      error: (err) => {
        this.handleServerValidation(err);
        this.loading.set(false);
      }
    });
  }

  private handleServerValidation(err: any) {
    if (err?.errors && typeof err.errors === 'object') {
      Object.keys(err.errors).forEach((field) => {
        const control = this.form.get(field);
        const messages = Array.isArray(err.errors[field]) ? err.errors[field].join(' ') : String(err.errors[field]);
        if (control) {
          control.setErrors({ server: messages });
        }
      });
      this.alert.error('Error de validación', 'Por favor, corrige los campos marcados.');
    } else {
      const message = err?.message || 'Ocurrió un error al guardar.';
      this.error.set(message);
      this.alert.error('Error', message);
    }
  }

  remove(id?: number) {
    if (!id) return;

    this.alert.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer.').then(result => {
      if (result.isConfirmed) {
        this.loading.set(true);
        this.service.delete(id).pipe(takeUntil(this.destroy$)).subscribe({
          next: (res: any) => {
            this.alert.success('Eliminado', res?.message || 'Producto eliminado correctamente');
            // Si la página queda vacía, retrocedemos una.
            if (this.products().length === 1 && this.page() > 1) {
              this.page.update(p => p - 1);
            } else {
              this.loadList(this.filters(), this.page(), this.perPage());
            }
            this.loading.set(false);
          },
          error: (err) => {
            const message = err?.message || 'Ocurrió un error al eliminar.';
            this.error.set(message);
            this.alert.error('Error eliminando', message);
            this.loading.set(false);
          }
        });
      }
    });
  }

  // Paginación
  goToPage(p: number, event?: Event) {
    event?.preventDefault();
    const last = this.meta()?.last_page ?? 1;
    const target = Math.max(1, Math.min(last, p));
    if (this.page() !== target) {
      this.page.set(target);
    }
  }

  setPerPage(n: number) {
    if (this.perPage() !== n) {
      this.page.set(1);
      this.perPage.set(n);
    }
  }

  // Helper: obtener snapshot de signals para el template
  get products$(): Product[] {
    return this.products();
  }

  get loading$(): boolean {
    return this.loading();
  }

  get error$(): string | null {
    return this.error();
  }

  get showForm$(): boolean {
    return this.showForm();
  }

  get meta$(): PaginationMeta {
    return this.meta();
  }

  min(a: number, b: number): number {
    return Math.min(a ?? 0, b ?? 0);
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
