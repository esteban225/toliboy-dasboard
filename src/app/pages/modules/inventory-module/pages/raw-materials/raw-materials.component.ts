import { Component, effect, signal, Signal, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { RawMaterialsService } from '../../services/raw-materials.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { RawMaterial, PaginationMeta } from '../../models/raw-material.model';

@Component({
  selector: 'app-raw-materials',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './raw-materials.component.html',
  styleUrl: './raw-materials.component.scss'
})
export class RawMaterialsComponent implements OnInit, OnDestroy {
  // Estados con Signals (Angular 17)
  rawMaterials = signal<RawMaterial[]>([]);
  selected = signal<RawMaterial | null>(null);
  loading = signal(false);
  error = signal<string | null>(null);
  page = signal(1);
  perPage = signal(15);
  meta = signal<PaginationMeta>({ current_page: 1, last_page: 1, per_page: 15, total: 0 });
  showForm = signal(false);

  // Formulario reactivo para crear/editar
  form: FormGroup;
  // Formulario de filtros
  filterForm: FormGroup;

  private service: RawMaterialsService;
  private destroy$ = new Subject<void>();
  private effectDisposer?: any;

  constructor(private fb: FormBuilder, rawMaterialsService: RawMaterialsService) {
    this.service = rawMaterialsService;
    this.form = this.buildForm();
    this.filterForm = this.buildFilterForm();
    // Cargar lista inicialmente y cada vez que cambie page/perPage
    this.effectDisposer = effect(() => {
      // leer valores de signals para activar el effect
      const _p = this.page();
      const _pp = this.perPage();
      this.loadList();
    });
  }

  ngOnInit(): void {
    // Inicializar carga (el effect también la llamará) — redundante pero explícito
    this.loadList();
  }

  // trackBy para ngFor
  trackById(index: number, item: RawMaterial) {
    return item?.id ?? index;
  }

  openCreate() {
    this.form.reset({ is_active: true, stock: 0, min_stock: 0 });
    this.selected.set(null);
    this.showForm.set(true);
  }

  private buildFilterForm(): FormGroup {
    return this.fb.group({
      name: [''],
      code: [''],
      is_active: [null], // null = any, true = active, false = inactive
      low_stock: [false], // true = stock <= min_stock
    });
  }

  applyFilters() {
    const raw = this.filterForm.value as any;
    const { name, code, is_active, low_stock } = raw;
    const filters: Record<string, any> = {};
    if (name) filters['name'] = name;
    if (code) filters['code'] = code;

    // Normalize is_active: accept true/false, 'true'/'false', 1/0
    let act: boolean | null = null;
    if (is_active === true || is_active === 'true' || is_active === 1 || is_active === '1') {
      act = true;
    } else if (is_active === false || is_active === 'false' || is_active === 0 || is_active === '0') {
      act = false;
    } else {
      act = null;
    }
    if (act !== null) filters['is_active'] = act;

    // low_stock should be boolean
    const lowStockBool = low_stock === true || low_stock === 'true' || low_stock === 1 || low_stock === '1';
    if (lowStockBool) filters['low_stock'] = true;
    // Reset to first page when applying filters
    this.page.set(1);
    this.loadList(filters);
  }

  clearFilters() {
    this.filterForm.reset({ name: '', code: '', is_active: null, low_stock: false });
    this.page.set(1);
    this.loadList();
  }

  private buildForm(): FormGroup {
    return this.fb.group({
      id: [null],
      name: ['', [Validators.required]],
      code: ['', [Validators.maxLength(100)]],
      description: [''],
      unit_of_measure: [''],
      stock: [0],
      min_stock: [0],
      is_active: [true],
      created_by: [null]
    });
  }

  loadList(filters: Record<string, any> = {}) {
    this.loading.set(true);
    this.error.set(null);

    this.service
      .list(filters, this.page(), this.perPage())
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (res) => {
          this.rawMaterials.set(res.data || []);
          this.meta.set(res.meta || { current_page: 1, last_page: 1, per_page: this.perPage(), total: 0 });
          this.loading.set(false);
        },
        error: (err) => {
          this.error.set(typeof err === 'string' ? err : JSON.stringify(err));
          this.loading.set(false);
        }
      });
  }

  select(material: RawMaterial | null) {
    this.selected.set(material);
    if (material) {
      this.form.patchValue(material);
      this.showForm.set(true);
    } else {
      this.form.reset({ is_active: true, stock: 0, min_stock: 0 });
      this.showForm.set(false);
    }
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const payload = this.form.value as Partial<RawMaterial>;
    this.loading.set(true);
    this.error.set(null);

    // Normalize and validate some fields client-side before sending
    if (payload.code && typeof payload.code === 'string') {
      payload.code = payload.code.trim().slice(0, 100);
    }
    // Ensure is_active is boolean
    if (payload.hasOwnProperty('is_active')) {
      const v: any = payload.is_active;
      payload.is_active = v === 'true' || v === true ? true : v === 'false' || v === false ? false : Boolean(v);
    }

    if (payload.id) {
      // update
  this.service.update(payload.id as number, payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (updated) => {
          this.loadList();
          this.select(null);
          this.loading.set(false);
        },
        error: (err) => {
          this.handleServerValidation(err);
          this.loading.set(false);
        }
      });
    } else {
      // create
  this.service.create(payload).pipe(takeUntil(this.destroy$)).subscribe({
        next: (created) => {
          this.loadList();
          this.select(null);
          this.loading.set(false);
        },
        error: (err) => {
          this.handleServerValidation(err);
          this.loading.set(false);
        }
      });
    }
  }

  private handleServerValidation(err: any) {
    // err may be a string or an object like { message: '', errors: { field: ['msg'] } }
    if (!err) {
      this.error.set('Error desconocido');
      return;
    }

    const payloadErrors = (err && err.errors) ? err.errors : null;
    if (payloadErrors && typeof payloadErrors === 'object') {
      // Map backend field errors to form controls if present
      Object.keys(payloadErrors).forEach((field) => {
        const control = this.form.get(field);
        const messages = Array.isArray(payloadErrors[field]) ? payloadErrors[field].join(' ') : String(payloadErrors[field]);
        if (control) {
          control.setErrors({ server: messages });
        } else {
          // if field not in form, append to global error
          const prev = this.error() ?? '';
          this.error.set((prev ? prev + ' ' : '') + `${field}: ${messages}`);
        }
      });
    } else if (err.message) {
      this.error.set(err.message);
    } else {
      this.error.set(typeof err === 'string' ? err : JSON.stringify(err));
    }
  }

  remove(id?: number) {
    if (!id) return;
    this.loading.set(true);
  this.service.delete(id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.loadList();
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(typeof err === 'string' ? err : JSON.stringify(err));
        this.loading.set(false);
      }
    });
  }

  // Paginación
  goToPage(p: number) {
    this.page.set(p);
  }

  setPerPage(n: number) {
    this.perPage.set(n);
  }

  // Helper: obtener snapshot de signals para el template
  get rawMaterials$(): RawMaterial[] {
    return this.rawMaterials();
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

  // helper to use Math.min in template (avoids template type-check issue)
  min(a: number, b: number): number {
    return Math.min(a ?? 0, b ?? 0);
  }

  ngOnDestroy(): void {
    // Limpiar efecto de signals
    if (this.effectDisposer) {
      try {
        if (typeof this.effectDisposer === 'function') {
          this.effectDisposer();
        } else if (typeof this.effectDisposer.destroy === 'function') {
          this.effectDisposer.destroy();
        }
      } catch (e) {
        // ignore
      }
    }
    // Completar subject para cerrar subscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }
}
