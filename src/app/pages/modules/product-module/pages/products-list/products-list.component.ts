import { Component, effect, signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { ProductsService } from '../../services/products.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { Subject, takeUntil } from 'rxjs';
import { Product, PaginationMeta } from '../../models/product.model';

@Component({
  selector: 'app-products-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, FormsModule],
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
  newSpecification: string = '';
  specKey: string = '';
  specQty: number | null = null;
  specFormatError: string = '';
  editingSpecIndex: number | null = null;

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
      specifications: [[]], // Array of strings
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
    this.specKey = '';
    this.specQty = null;
    this.specFormatError = '';
    this.editingSpecIndex = null;
    this.newSpecification = '';
    if (product) {
      // Asegura que specifications sea array
      const specsArr = Array.isArray(product.specifications)
        ? product.specifications
        : (typeof product.specifications === 'string' && (product.specifications as string).length > 0)
          ? (product.specifications as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : [];
      this.form.patchValue({
        ...product,
        specifications: specsArr
      });
      this.newSpecification = '';
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
        specifications: [],
        unit_price: null,
        is_active: true,
        created_by: createdBy
      });
      this.newSpecification = '';
      this.showForm.set(false);
    }
  }

  openCreate(): void {
    const user = this.auth.currentUserValue;
    const createdBy = user?.id?.toString() ?? user?.name ?? 'system';
    this.selected.set(null);
    this.specKey = '';
    this.specQty = null;
    this.specFormatError = '';
    this.editingSpecIndex = null;
    this.newSpecification = '';
    this.form.reset({
      id: null,
      name: '',
      code: '',
      description: '',
      category: '',
      specifications: [],
      unit_price: null,
      is_active: true,
      created_by: createdBy
    });
    this.newSpecification = '';
    this.showForm.set(true);
  }

  save(): void {
    if (this.loading()) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = { ...this.form.value } as Partial<Product>;

    // Asegura que specifications es array de strings
    if (!Array.isArray(payload.specifications)) {
      payload.specifications = [];
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

  addSpecification(): void {
    this.specFormatError = '';

    const key = (this.specKey || '').trim();

    if (!key) {
      this.specFormatError = 'El nombre o código de materia prima es requerido.';
      return;
    }
    if (this.specQty === null || this.specQty === undefined || (this.specQty as any) === '') {
      this.specFormatError = 'La cantidad por unidad es requerida.';
      return;
    }

    const qty = typeof this.specQty === 'number'
      ? this.specQty
      : parseFloat(String(this.specQty).replace(',', '.'));

    if (!Number.isFinite(qty) || qty <= 0) {
      this.specFormatError = 'La cantidad debe ser un número mayor a 0.';
      return;
    }

    const value = `${key}: ${qty}`;
    const current: string[] = this.form.get('specifications')?.value || [];

    const duplicate = current.some((s, idx) => {
      if (idx === this.editingSpecIndex) return false; // ignorar el que se está editando
      const existingKey = s.includes(':') ? s.split(':')[0].trim().toLowerCase() : s.trim().toLowerCase();
      return existingKey === key.toLowerCase();
    });

    if (duplicate) {
      this.specFormatError = `Ya existe una especificación para "${key}".`;
      return;
    }

    if (this.editingSpecIndex !== null && this.editingSpecIndex >= 0 && this.editingSpecIndex < current.length) {
      // Reemplazar en su posición original
      const updated = [...current];
      updated[this.editingSpecIndex] = value;
      this.form.get('specifications')?.setValue(updated);
    } else {
      this.form.get('specifications')?.setValue([...current, value]);
    }

    this.specKey = '';
    this.specQty = null;
    this.editingSpecIndex = null;
    this.newSpecification = '';
  }

  editSpecification(index: number): void {
    const current: string[] = this.form.get('specifications')?.value || [];
    const spec = current[index];
    if (!spec) return;
    const colonIdx = spec.lastIndexOf(':');
    this.specKey = colonIdx >= 0 ? spec.substring(0, colonIdx).trim() : spec.trim();
    const rawQty = colonIdx >= 0 ? spec.substring(colonIdx + 1).trim() : '';
    this.specQty = rawQty ? parseFloat(rawQty) : null;
    this.specFormatError = '';
    this.editingSpecIndex = index;
  }

  cancelEditSpec(): void {
    this.specKey = '';
    this.specQty = null;
    this.specFormatError = '';
    this.editingSpecIndex = null;
  }

  removeSpecification(index: number): void {
    const current = this.form.get('specifications')?.value || [];
    if (index < 0 || index >= current.length) return;
    const updated = [...current.slice(0, index), ...current.slice(index + 1)];
    this.form.get('specifications')?.setValue(updated);
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