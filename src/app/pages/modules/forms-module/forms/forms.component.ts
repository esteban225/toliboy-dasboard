import { Component, OnDestroy, OnInit } from '@angular/core';
import { trigger, style, transition, animate } from '@angular/animations';
import { Observable, Subject } from 'rxjs';
import { takeUntil, take } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as FormResponseActions from '../store/actions/formResponse.actions';
import * as FormResponseSelectors from '../store/selectors/formResponse.selectors';
import { AlertService } from 'src/app/core/services/alert.service';
import { BatchesService } from 'src/app/pages/modules/batches-module/services/batches.service';

interface FormField {
  field_code?: string;
  name?: string;
  code?: string;
  label?: string;
  title?: string;
  type?: string;
  field_type?: string;
  required?: boolean | string;
  mandatory?: boolean;
  placeholder?: string;
  hint?: string;
  description?: string;
  help?: string;
  options?: Array<{ value: string; label: string } | string>;
  min?: number;
  max?: number;
  minLength?: number;
  maxLength?: number;
  min_length?: number;
  max_length?: number;
  pattern?: string;
  step?: number;
  fullWidth?: boolean;
  accept?: string;
  [key: string]: any;
}

interface AppForm {
  id: number;
  name?: string;
  title?: string;
  description?: string;
  version?: string;
  status?: string;
  form_fields?: FormField[];
}

interface Batch {
  id: number;
  name?: string;
  code?: string;
  status?: string;
}

const FIELD_ICON_MAP: Record<string, string> = {
  text: 'fas fa-font', string: 'fas fa-font', email: 'fas fa-envelope',
  password: 'fas fa-lock', number: 'fas fa-hashtag', integer: 'fas fa-hashtag',
  decimal: 'fas fa-calculator', float: 'fas fa-calculator', tel: 'fas fa-phone',
  phone: 'fas fa-phone', url: 'fas fa-link', search: 'fas fa-search',
  date: 'fas fa-calendar', time: 'fas fa-clock', 'datetime-local': 'fas fa-calendar-alt',
  datetime: 'fas fa-calendar-alt', month: 'fas fa-calendar-check',
  week: 'fas fa-calendar-week', textarea: 'fas fa-align-left',
  text_area: 'fas fa-align-left', select: 'fas fa-list', dropdown: 'fas fa-list',
  checkbox: 'fas fa-check-square', radio: 'fas fa-dot-circle',
  file: 'fas fa-file-upload', image: 'fas fa-image',
  range: 'fas fa-sliders-h', color: 'fas fa-palette',
};

const INPUT_TYPE_MAP: Record<string, string> = {
  string: 'text', phone: 'tel', integer: 'number', decimal: 'number', float: 'number',
};

const TEXT_FIELD_TYPES  = new Set(['text', 'string', 'email', 'password', 'tel', 'phone', 'url', 'search']);
const DATETIME_FIELD_TYPES = new Set(['date', 'time', 'datetime-local', 'datetime', 'month', 'week']);
const NUMERIC_FIELD_TYPES  = new Set(['number', 'integer', 'decimal', 'float']);
const FULL_WIDTH_TYPES  = new Set(['textarea', 'text_area', 'file', 'image', 'range', 'color']);

@Component({
  selector: 'app-forms',
  templateUrl: './forms.component.html',
  styleUrls: ['./forms.component.scss'],
  animations: [
    trigger('fadeZoom', [
      transition(':enter', [
        style({ opacity: 0, transform: 'scale(0.9)' }),
        animate('350ms ease-out', style({ opacity: 1, transform: 'scale(1)' })),
      ]),
      transition(':leave', [
        animate('250ms ease-in', style({ opacity: 0, transform: 'scale(0.95)' })),
      ]),
    ]),
  ],
})
export class FormsComponent implements OnInit, OnDestroy {

  forms$: Observable<AppForm[]> = this.store.select(FormResponseSelectors.selectForms);

  // Estado modal
  modalVisible  = false;
  loadingFields = false;
  loadingBatches = false;
  submitting    = false;

  selectedForm: AppForm | null = null;
  dynamicForm!: FormGroup;

  // Lotes
  batches: Batch[]         = [];
  filteredBatches: Batch[] = [];
  selectedBatchId: number | null = null;
  batchSearchText = '';

  get modalTitle(): string {
    return this.selectedForm?.title ?? this.selectedForm?.name ?? 'Formulario';
  }

  private destroy$ = new Subject<void>();

  constructor(
    private store: Store,
    private fb: FormBuilder,
    private alertService: AlertService,
    private batchesService: BatchesService,
  ) {}

  ngOnInit(): void {
    this.store.dispatch(FormResponseActions.fetchAllForms());
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // ── Modal ────────────────────────────────────────────────────────────────

  openModal(form: AppForm): void {
    this.selectedForm = { ...form };
    this.modalVisible = true;
    this.dynamicForm  = this.fb.group({});
    this.loadBatches();
    if (form.id) this.loadFormFields(form.id);
  }

  closeModal(): void {
    this.modalVisible   = false;
    this.selectedForm   = null;
    this.dynamicForm    = this.fb.group({});
    this.selectedBatchId = null;
    this.batchSearchText = '';
    this.batches         = [];
    this.filteredBatches = [];
    this.submitting      = false;
  }

  // ── Carga de datos ───────────────────────────────────────────────────────

  private loadBatches(): void {
    this.loadingBatches = true;
    this.batchesService.list({ status: 'in_process' }, 1, 999)
      .pipe(take(1))
      .subscribe({
        next: (response: any) => {
          this.batches         = response?.data ?? response ?? [];
          this.filteredBatches = [...this.batches];
          this.loadingBatches  = false;
        },
        error: (err) => {
          this.batches         = [];
          this.filteredBatches = [];
          this.loadingBatches  = false;
          this.alertService.error('Error cargando lotes', err?.message ?? 'Error desconocido');
        },
      });
  }

  private loadFormFields(formId: number): void {
    this.loadingFields = true;
    this.store.dispatch(FormResponseActions.loadFormFields({ formId }));

    this.store.select(FormResponseSelectors.selectFormFieldsByFormId(formId))
      .pipe(takeUntil(this.destroy$))
      .subscribe(fields => {
        if (!fields?.length) return;
        this.loadingFields = false;
        if (this.selectedForm?.id === formId) {
          this.selectedForm = { ...this.selectedForm, form_fields: [...fields] };
          this.buildDynamicForm(fields);
        }
      });
  }

  // ── Formulario dinámico ──────────────────────────────────────────────────

  private buildDynamicForm(fields: FormField[]): void {
    const controls = fields.reduce((acc, field) => {
      acc[this.getFieldCode(field)] = ['', this.buildValidators(field)];
      return acc;
    }, {} as Record<string, any>);
    this.dynamicForm = this.fb.group(controls);
  }

  private buildValidators(field: FormField): any[] {
    const validators: any[] = [];
    const type = this.getFieldType(field);

    if (this.isFieldRequired(field)) validators.push(Validators.required);

    if (NUMERIC_FIELD_TYPES.has(type)) {
      validators.push(Validators.pattern(/^-?\d+(?:\.\d+)?$/));
      if (field.min !== undefined) validators.push(Validators.min(field.min));
      if (field.max !== undefined) validators.push(Validators.max(field.max));
    } else if (type === 'email') {
      validators.push(Validators.email);
    } else if (type === 'url') {
      validators.push(Validators.pattern(/^https?:\/\/.+/));
    } else if (type === 'tel' || type === 'phone') {
      validators.push(Validators.pattern(field.pattern ?? /^[\+]?[0-9\s\-\(\)]{10,}$/));
    } else if (type === 'password') {
      validators.push(Validators.minLength(field.minLength ?? 8));
    }

    const minLen = field.minLength ?? field.min_length;
    const maxLen = field.maxLength ?? field.max_length;
    if (minLen) validators.push(Validators.minLength(minLen));
    if (maxLen) validators.push(Validators.maxLength(maxLen));

    return validators;
  }

  // ── Envío ────────────────────────────────────────────────────────────────

  onSubmitForm(): void {
    if (!this.dynamicForm?.valid) {
      Object.values(this.dynamicForm.controls).forEach(c => c.markAsTouched());
      return;
    }
    if (!this.selectedBatchId) {
      this.alertService.warning('Selecciona un lote', 'Debes seleccionar un lote para enviar el formulario');
      return;
    }

    this.submitting = true;
    this.store.dispatch(FormResponseActions.submitForm({
      formData: {
        form_id: this.selectedForm!.id,
        batch_id: this.selectedBatchId,
        status: 'completed',
        values: this.dynamicForm.value,
      },
    }));

    setTimeout(() => {
      this.submitting = false;
      this.alertService.success('Formulario enviado correctamente');
      this.closeModal();
    }, 1500);
  }

  resetForm(): void {
    this.dynamicForm?.reset();
  }

  // ── Lotes ────────────────────────────────────────────────────────────────

  filterBatches(): void {
    const search = this.batchSearchText.trim().toLowerCase();
    this.filteredBatches = search
      ? this.batches.filter(b =>
          b.name?.toLowerCase().includes(search) ||
          b.code?.toLowerCase().includes(search) ||
          b.id?.toString().includes(search),
        )
      : [...this.batches];
  }

  selectBatch(batchId: number): void {
    this.selectedBatchId = batchId;
  }

  getSelectedBatchDisplay(): string {
    if (!this.selectedBatchId) return '';
    const batch = this.batches.find(b => b.id === this.selectedBatchId);
    return batch ? `${batch.name ?? 'Lote'} (${batch.code ?? '#' + batch.id})` : '';
  }

  // ── Helpers de campos ────────────────────────────────────────────────────

  getFieldCode(field: FormField): string        { return field.field_code ?? field.name ?? field.code ?? 'unknown_field'; }
  getFieldLabel(field: FormField): string       { return field.label ?? field.title ?? field.name ?? 'Campo'; }
  getFieldType(field: FormField): string        { return field.type ?? field.field_type ?? 'text'; }
  getFieldPlaceholder(field: FormField): string { return field.placeholder ?? field.hint ?? ''; }
  getFieldDescription(field: FormField): string { return field.description ?? field.help ?? ''; }
  getFieldIcon(field: FormField): string        { return FIELD_ICON_MAP[this.getFieldType(field)] ?? 'fas fa-question-circle'; }
  getInputType(field: FormField): string        { return INPUT_TYPE_MAP[this.getFieldType(field)] ?? this.getFieldType(field); }
  getAcceptedFileTypes(field: FormField): string { return this.getFieldType(field) === 'image' ? 'image/*' : field.accept ?? '*/*'; }

  isFieldRequired(field: FormField): boolean  { return field.required === true || field.required === 'true' || field.mandatory === true; }
  isTextInputField(field: FormField): boolean  { return TEXT_FIELD_TYPES.has(this.getFieldType(field)); }
  isDateTimeField(field: FormField): boolean   { return DATETIME_FIELD_TYPES.has(this.getFieldType(field)); }
  isNumericField(field: FormField): boolean    { return NUMERIC_FIELD_TYPES.has(this.getFieldType(field)); }
  isFullWidthField(field: FormField): boolean  { return FULL_WIDTH_TYPES.has(this.getFieldType(field)) || field.fullWidth === true; }

  // ── Progreso ─────────────────────────────────────────────────────────────

  getActiveFormsCount(forms: AppForm[]): number {
    return forms?.filter(f => f.status === 'active' || !f.status).length ?? 0;
  }

  getFormProgress(): number {
    const total = this.selectedForm?.form_fields?.length ?? 0;
    if (!total || !this.dynamicForm) return 0;
    return Math.round((this.getCompletedFieldsCount() / total) * 100);
  }

  getCompletedFieldsCount(): number {
    if (!this.selectedForm?.form_fields || !this.dynamicForm) return 0;
    return this.selectedForm.form_fields.reduce((count, field) => {
      const value = this.dynamicForm.get(this.getFieldCode(field))?.value;
      return value !== null && value !== undefined && value !== '' ? count + 1 : count;
    }, 0);
  }

  // ── Inputs especiales ─────────────────────────────────────────────────────

  onCheckboxChange(event: Event, fieldCode: string, value: string): void {
    const checked = (event.target as HTMLInputElement).checked;
    const current: string[] = this.dynamicForm.get(fieldCode)?.value ?? [];
    const updated = checked ? [...current, value] : current.filter(v => v !== value);
    this.dynamicForm.patchValue({ [fieldCode]: updated });
  }

  onFileChange(event: Event, fieldCode: string): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files?.length) return;

    const oversized = Array.from(files).find(f => f.size > 5 * 1024 * 1024);
    if (oversized) {
      this.alertService.error(`El archivo "${oversized.name}" excede el tamaño máximo (5MB)`);
      this.dynamicForm.patchValue({ [fieldCode]: null });
      return;
    }
    this.dynamicForm.patchValue({ [fieldCode]: input.multiple ? Array.from(files) : files[0] });
  }

  isChecked(fieldCode: string, value: string): boolean {
    const current = this.dynamicForm?.get(fieldCode)?.value;
    return Array.isArray(current) ? current.includes(value) : current === value;
  }
}