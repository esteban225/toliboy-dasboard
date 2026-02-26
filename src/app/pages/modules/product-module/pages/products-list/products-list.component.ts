import { Component, effect, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductsService } from '../../services/products.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { Product, PaginationMeta } from '../../models/product.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './products-list.component.html'
})
export class ProductsListComponent implements OnInit, OnDestroy {

  // ✅ Exponer Math.min al template (necesario para la paginación)
  readonly min = Math.min;

  // Signals
  products = signal<Product[]>([]);
  selected = signal<Product | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  perPage = signal(10);
  filters = signal<Record<string, any>>({});
  meta = signal<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  showForm = signal(false);

  form: FormGroup;
  filterForm: FormGroup;

  private destroy$ = new Subject<void>();

  constructor(
    private fb: FormBuilder,
    private service: ProductsService,
    private alert: AlertService,
    private auth: AuthenticationService
  ) {
    this.form = this.buildForm();
    this.filterForm = this.buildFilterForm();

    // Auto-cargar cuando cambian page, perPage o filters
    effect(() => {
      this.loadList(this.filters(), this.page(), this.perPage());
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void { }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // -----------------------------
  // BUILD FORMS
  // -----------------------------
  private buildForm(): FormGroup {
    const user = this.auth.currentUserValue;
    const createdBy = user?.id?.toString() ?? user?.name ?? 'system';

    return this.fb.group({
      id: [null],
      name: ['', Validators.required],
      code: [''],
      description: [''],
      category: [''],
      specifications: [''],
      // ✅ FIX: unit_price inicia en null para no bloquear validación min(0.01)
      //    cuando el backend devuelve 0 en productos existentes
      unit_price: [null, [Validators.required, Validators.min(0)]],
      is_active: [true],
      created_by: [createdBy]
    });
  }

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      name: [''],
      code: [''],
      category: [''],
      low_stock: [false]
    });
  }

  // -----------------------------
  // LISTA
  // -----------------------------
  loadList(filters: any, page: number, perPage: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.service.list(filters, page, perPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.products.set(res.data ?? []);
          this.meta.set(res.meta ?? { current_page: 1, last_page: 1, per_page: perPage, total: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          const message = err?.message ?? 'Ocurrió un error inesperado.';
          this.error.set(message);
          this.alert.error('Error', message);
          this.loading.set(false);
        }
      });
  }

  forceReload(): void {
    this.loadList(this.filters(), this.page(), this.perPage());
  }

  // -----------------------------
  // FILTROS
  // -----------------------------
  applyFilters(): void {
    const raw = this.filterForm.value;
    const f: Record<string, any> = {};

    if (raw.name?.trim()) f['name'] = raw.name.trim();
    if (raw.code?.trim()) f['code'] = raw.code.trim();
    if (raw.category?.trim()) f['category'] = raw.category.trim();
    if (raw.low_stock) f['low_stock'] = true;

    this.page.set(1);
    this.filters.set(f);
  }

  clearFilters(): void {
    this.filterForm.reset({ name: '', code: '', category: '', low_stock: false });
    this.page.set(1);
    this.filters.set({});
  }

  // -----------------------------
  // CRUD
  // -----------------------------
  select(product: Product | null): void {
    this.selected.set(product);

    if (product) {
      // ✅ FIX PRINCIPAL: convertir specifications[] → string CSV para el textarea
      const specsAsString = Array.isArray(product.specifications)
        ? product.specifications.join(', ')
        : (product.specifications ?? '');

      // ✅ patchValue con spread + specifications convertida
      this.form.patchValue({
        ...product,
        specifications: specsAsString
      });

      this.showForm.set(true);
    } else {
      const user = this.auth.currentUserValue;
      const createdBy = user?.id?.toString() ?? user?.name ?? 'system';

      this.form.reset({
        id: null,
        name: '',
        code: '',
        description: '',
        category: '',
        specifications: '',
        unit_price: null,
        is_active: true,
        created_by: createdBy
      });

      this.showForm.set(false);
    }
  }

  openCreate(): void {
    // ✅ FIX: no llamar select(null) primero (ya cierra el form),
    //    limpiar el form y abrir directamente
    const user = this.auth.currentUserValue;
    const createdBy = user?.id?.toString() ?? user?.name ?? 'system';

    this.selected.set(null);
    this.form.reset({
      id: null,
      name: '',
      code: '',
      description: '',
      category: '',
      specifications: '',
      unit_price: null,
      is_active: true,
      created_by: createdBy
    });

    this.showForm.set(true);
  }

  save(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { ...this.form.value } as Partial<Product>;

    // ✅ Convertir specifications string CSV → array antes de enviar
    if (typeof payload.specifications === 'string') {
      const raw = (payload.specifications as string).trim();
      payload.specifications = raw
        ? raw.split(',').map((s: string) => s.trim()).filter(Boolean)
        : [];
    }

    // Asegurar created_by
    const user = this.auth.currentUserValue;
    payload.created_by = user?.id?.toString() ?? user?.name ?? 'system';

    // ✅ Asegurar que unit_price sea número
    payload.unit_price = Number(payload.unit_price) || 0;

    this.loading.set(true);

    const isEdit = !!payload.id;
    const op$ = isEdit
      ? this.service.update(Number(payload.id), payload)
      : this.service.create(payload);

    op$.pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.alert.success(
          isEdit ? 'Actualizado' : 'Creado',
          `El producto se ${isEdit ? 'actualizó' : 'creó'} correctamente.`
        );
        this.select(null);
        this.loadList(this.filters(), this.page(), this.perPage());
        this.loading.set(false);
      },
      error: (err) => {
        this.handleServerValidation(err);
        this.loading.set(false);
      }
    });
  }

  remove(id?: number): void {
    if (!id) return;

    this.alert.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer.')
      .then(result => {
        if (!result.isConfirmed) return;

        this.loading.set(true);

        this.service.delete(id)
          .pipe(takeUntil(this.destroy$))
          .subscribe({
            next: () => {
              this.alert.success('Producto eliminado');
              // ✅ Si era el último de la página, retroceder una página
              if (this.products().length === 1 && this.page() > 1) {
                this.page.update(p => p - 1);
              } else {
                this.loadList(this.filters(), this.page(), this.perPage());
              }
              this.loading.set(false);
            },
            error: (err) => {
              const msg = err?.message ?? 'Ocurrió un error al eliminar.';
              this.alert.error('Error', msg);
              this.loading.set(false);
            }
          });
      });
  }

  // ✅ trackBy para optimizar el ngFor
  trackById(index: number, item: Product): number {
    return item.id!;
  }

  // -----------------------------
  // SERVER VALIDATION
  // -----------------------------
  private handleServerValidation(err: any): void {
    if (err?.errors && typeof err.errors === 'object') {
      Object.keys(err.errors).forEach(field => {
        const control = this.form.get(field);
        if (control) {
          const messages = Array.isArray(err.errors[field])
            ? err.errors[field].join(' ')
            : err.errors[field];
          control.setErrors({ server: messages });
        }
      });
      this.alert.error('Error de validación', 'Revisa los campos marcados.');
    } else {
      const msg = err?.message ?? 'Error al guardar';
      this.error.set(msg);
      this.alert.error('Error', msg);
    }
  }

  // -----------------------------
  // PAGINACIÓN
  // -----------------------------
  goToPage(p: number, event?: Event): void {
    event?.preventDefault();
    const last = this.meta().last_page ?? 1;
    const target = Math.max(1, Math.min(last, p));
    if (this.page() !== target) this.page.set(target);
  }

  setPerPage(n: number): void {
    if (this.perPage() !== n) {
      this.page.set(1);
      this.perPage.set(n);
    }
  }
}