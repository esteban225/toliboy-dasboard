import { Component, effect, signal, Signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { BatchesService } from '../../services/batches.service';
import { ProductsService } from 'src/app/pages/modules/product-module/services/products.service';
import { AlertService } from 'src/app/core/services/alert.service';
import { AuthenticationService } from 'src/app/core/services/auth.service';
import { NotificationsApiService } from 'src/app/core/services/notifications-api.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Batch, PaginationMeta } from '../../models/batch.model';

@Component({
  selector: 'app-batches-list',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './batches-list.component.html',
  styleUrls: ['./batches-list.component.scss']
})
export class BatchesListComponent implements OnInit, OnDestroy {
  // Estados con Signals (Angular 17)
  batches = signal<Batch[]>([]);
  selected = signal<Batch | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  perPage = signal(10);
  filters = signal<Record<string, any>>({});
  meta = signal<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 10, total: 0 });
  showForm = signal(false);
  products = signal<any[]>([]); // Para el select de productos

  // Formularios reactivos
  form: FormGroup;
  filterForm: FormGroup;

  private service: BatchesService;
  private alert: AlertService;
  private authService: AuthenticationService;
  private productsService: ProductsService;
  private notificationsApi: NotificationsApiService;
  private destroy$ = new Subject<void>();


  constructor(
    private fb: FormBuilder,
    batchesService: BatchesService,
    alertService: AlertService,
    authService: AuthenticationService,
    productsService: ProductsService,
    notificationsApi: NotificationsApiService
  ) {
    this.service = batchesService;
    this.alert = alertService;
    this.authService = authService;
    this.productsService = productsService;
    this.notificationsApi = notificationsApi;
    this.form = this.buildForm();
    this.filterForm = this.buildFilterForm();

    // Cargar lista cada vez que cambie la página, el tamaño de página o los filtros
    effect(() => {
      const p = this.page();
      const pp = this.perPage();
      const f = this.filters();
      this.loadList(f, p, pp);
    }, { allowSignalWrites: true });
  }

  ngOnInit(): void {
    // La carga inicial es manejada por el effect
    this.loadProducts();
  }

  loadProducts(filters: Record<string, any> = {}, page = 1, perPage = 99) {
    this.products.set([]);
    console.debug('[Batches] loadProducts: requesting products', { filters, page, perPage });
    this.productsService
      .list(filters, page, perPage)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          console.debug('[Batches] loadProducts: response', res);
          this.products.set(res.data || []);
        },
        error: (err) => {
          console.error('[Batches] loadProducts: error', err);
          // Mostrar alerta breve pero no bloquear la UI principal
          const message = err?.message || 'Error cargando productos';
          this.error.set(message);
          // mantiene la alerta para el usuario pero no lanza múltiples modales
          this.alert.error('Error cargando productos', message);
        }
      });
  }


  trackById(index: number, item: Batch) {
    return item?.id ?? index;
  }

  openCreate() {
    const currentUser = this.authService.currentUserValue;
    const createdBy = currentUser?.id || 0;
    this.form.reset({
      status: 'planned',
      quantity: 1,
      defect_quantity: 0,
      created_by: createdBy
    });
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
      status: [''],
    });
  }

  applyFilters() {
    const raw = this.filterForm.value as any;
    const filters: Record<string, any> = {};
    if (raw.name) filters['name'] = raw.name;
    if (raw.code) filters['code'] = raw.code;
    if (raw.status !== '') filters['status'] = raw.status;

    this.page.set(1);
    this.filters.set(filters);
  }

  clearFilters() {
    this.filterForm.reset();
    this.page.set(1);
    this.filters.set({});
  }

  private buildForm(): FormGroup {
    const currentUser = this.authService.currentUserValue;
    const createdBy = currentUser?.id || 0;

    return this.fb.group({
      id: [null],
      name: ['', [Validators.required]],
      code: [''],
      product_id: ['', [Validators.required]],
      start_date: ['', [Validators.required]],
      expected_end_date: ['', [Validators.required]],
      actual_end_date: [''],
      status: ['planned'],
      quantity: [1, [Validators.required, Validators.min(1)]],
      defect_quantity: [0],
      notes: [''],
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
          this.batches.set(res.data || []);
          this.meta.set(res.meta || { current_page: 1, last_page: 1, per_page: perPage, total: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          const message = err?.message || 'Ocurrió un error desconocido.';
          this.error.set(message);
          this.alert.error('Error cargando lotes', message);
          this.loading.set(false);
        }
      });
  }

  select(batch: Batch | null) {
    this.selected.set(batch);
    if (batch) {
      // Convertir fechas al formato compatible con `input[type=datetime-local]`
      const patched = { ...batch } as any;
      patched.start_date = this.formatForInputDatetimeLocal(batch.start_date) ?? '';
      patched.expected_end_date = this.formatForInputDatetimeLocal(batch.expected_end_date) ?? '';
      if (batch.actual_end_date) patched.actual_end_date = this.formatForInputDatetimeLocal(batch.actual_end_date) ?? '';
      this.form.patchValue(patched);
      this.showForm.set(true);
    } else {
      const currentUser = this.authService.currentUserValue;
      const createdBy = currentUser?.id || 0;
      this.form.reset({
        status: 'planned',
        quantity: 1,
        defect_quantity: 0,
        created_by: createdBy
      });
      this.showForm.set(false);
    }
  }

  private formatForInputDatetimeLocal(date?: string | null): string | null {
    if (!date) return null;
    const d = new Date(date);
    if (isNaN(d.getTime())) return null;
    const pad = (n: number) => n.toString().padStart(2, '0');
    const year = d.getFullYear();
    const month = pad(d.getMonth() + 1);
    const day = pad(d.getDate());
    const hours = pad(d.getHours());
    const minutes = pad(d.getMinutes());
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }



  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value as Partial<Batch>;

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
        const isUpdate = !!payload.id;
        this.alert.success(
          isUpdate ? 'Actualizado' : 'Creado',
          `El lote se ${isUpdate ? 'actualizó' : 'creó'} correctamente.`
        );
        if (!isUpdate) {
          this.notifyBatchCreation(result?.data ?? null, payload);
        }
        this.select(null);
        this.loading.set(false);
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
            this.alert.success('Eliminado', res?.message || 'Lote eliminado correctamente');
            if (this.batches().length === 1 && this.page() > 1) {
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

  // Helpers
  get batches$(): Batch[] {
    return this.batches();
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

  get products$(): any[] {
    return this.products();
  }

  get meta$(): PaginationMeta {
    return this.meta();
  }

  min(a: number, b: number): number {
    return Math.min(a ?? 0, b ?? 0);
  }

  formatDate(date?: string): string {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-ES');
  }

  getStatusBadgeClass(batch: Batch): string {
    const status = batch.status;
    const statusStr = String(status || '').toLowerCase().trim();

    switch (statusStr) {
      case 'planned':
        return 'bg-secondary bg-opacity-10 text-secondary border border-secondary';
      case 'in_process':
        return 'bg-info bg-opacity-10 text-info border border-info';
      case 'paused':
        return 'bg-warning bg-opacity-10 text-warning border border-warning';
      case 'completed':
      case 'delivered':
        return 'bg-success bg-opacity-10 text-success border border-success';
      case 'cancelled':
        return 'bg-danger bg-opacity-10 text-danger border border-danger';
      case 'true':
      case '1':
        return 'bg-success bg-opacity-10 text-success border border-success';
      case 'false':
      case '0':
        return 'bg-danger bg-opacity-10 text-danger border border-danger';
      default:
        return 'bg-secondary bg-opacity-10 text-secondary';
    }
  }

  getStatusLabel(status?: string | boolean): string {
    const statusStr = String(status || '').toLowerCase().trim();

    switch (statusStr) {
      case 'planned':
        return 'Planificado';
      case 'in_process':
        return 'En Proceso';
      case 'paused':
        return 'Pausado';
      case 'completed':
        return 'Completado';
      case 'delivered':
        return 'Entregado';
      case 'cancelled':
        return 'Cancelado';
      case 'true':
      case '1':
        return 'Activo';
      case 'false':
      case '0':
        return 'Inactivo';
      default:
        return statusStr || '-';
    }
  }

  private notifyBatchCreation(createdBatch?: Partial<Batch> | null, fallback?: Partial<Batch>) {
    const source = createdBatch ?? fallback;
    if (!source || !this.notificationsApi) {
      return;
    }

    const relatedId = this.toNumber(source.id);
    const payload: any = {
      title: 'Nuevo lote creado',
      message: this.buildBatchNotificationMessage(source),
      type: 'info',
      scope: 'group',
      roles: ['OP'], 
    };

    if (relatedId !== null) {
      payload.related_id = relatedId;
      payload.related_table = 'batches';
    }

    this.sendNotificationPayload(payload, source, relatedId);
  }

  private sendNotificationPayload(
    payload: any,
    source: Partial<Batch>,
    relatedId: number | null
  ) {
    this.notificationsApi.createNotification(payload)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          console.debug('[Batches] Notificación enviada para el lote', relatedId ?? source.name ?? source.code, payload);
        },
        error: (err) => {
          const apiMessage = this.resolveNotificationError(err);
          console.error('[Batches] Error enviando notificación de lote', err, payload);
          this.alert.warning('Notificación pendiente', apiMessage);
        }
      });
  }

  private resolveNotificationError(err: any): string {
    const validationErrors = err?.error?.errors;
    if (validationErrors && typeof validationErrors === 'object') {
      const messages: string[] = [];
      Object.keys(validationErrors).forEach((field) => {
        const fieldErrors = validationErrors[field];
        if (Array.isArray(fieldErrors)) {
          messages.push(...fieldErrors.map((msg) => String(msg)));
        } else if (fieldErrors) {
          messages.push(String(fieldErrors));
        }
      });
      if (messages.length) {
        return messages.join(' | ');
      }
    }

    return err?.error?.message || err?.message || 'No se pudo notificar al grupo OP sobre el nuevo lote.';
  }

  private buildBatchNotificationMessage(batch: Partial<Batch>): string {
    const label = batch.name || batch.code || (batch.id ? `Lote #${batch.id}` : 'Nuevo lote');
    const productLabel = this.resolveProductLabel(batch);
    const fragments = [
      `Producto: ${productLabel}`,
      `Cantidad: ${batch.quantity ?? 0}`
    ];

    if (batch.start_date) {
      fragments.push(`Inicio: ${this.formatDateTimeForNotification(batch.start_date)}`);
    }
    if (batch.expected_end_date) {
      fragments.push(`Fin estimado: ${this.formatDateTimeForNotification(batch.expected_end_date)}`);
    }

    return `${label} creado. ${fragments.join(' | ')}`;
  }

  private resolveProductLabel(batch: Partial<Batch>): string {
    if (batch.product_name) {
      return batch.product_name;
    }

    const productId = this.toNumber(batch.product_id);
    if (productId !== null) {
      const product = this.products().find((p: any) => this.toNumber(p?.id) === productId);
      if (product) {
        if (product.name && product.code) {
          return `${product.name} (${product.code})`;
        }
        return product.name ?? `Producto #${productId}`;
      }
      return `Producto #${productId}`;
    }

    return 'Producto sin especificar';
  }

  private formatDateTimeForNotification(value?: string | null): string {
    if (!value) {
      return 'sin fecha';
    }

    const date = new Date(value);
    if (isNaN(date.getTime())) {
      return String(value);
    }

    return date.toLocaleString('es-ES', { dateStyle: 'medium', timeStyle: 'short' });
  }

  private toNumber(value: any): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }
}
