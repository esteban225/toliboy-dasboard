import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  trigger,
  style,
  transition,
  animate,
} from '@angular/animations';
import { Observable, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import * as FormResponseActions from '../store/actions/formResponse.actions';
import * as FormResponseSelectors from '../store/selectors/formResponse.selectors';
import { AlertService } from 'src/app/core/services/alert.service';
import { BatchesService } from 'src/app/pages/modules/batches-module/services/batches.service';

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

  forms$: Observable<any[]>;
  formResponse$: Observable<any>;
  private subscriptions: Subscription[] = [];
  formValidatorRules$: Observable<any>;

  // UI state variables
  showProduccion = false;
  showMateria = false;
  modalVisible = false;
  modalTitle = '';
  selectedForm: any = null;
  selectedFormValidationRules: any = null;

  // Loading & submitting states
  loadingFields = false;
  submitting = false;

  // Formulario dinámico
  dynamicForm!: FormGroup;

  // Propiedades para gestionar lotes
  batches: any[] = [];
  selectedBatchId: number | null = null;
  loadingBatches = false;
  batchesSearchText = '';
  filteredBatches: any[] = [];

  constructor(
    private store: Store,
    private alertService: AlertService,
    private fb: FormBuilder,
    private batchesService: BatchesService
  ) {
    this.forms$ = this.store.select(FormResponseSelectors.selectForms);
    this.formResponse$ = this.store.select(FormResponseSelectors.selectFormResponse);
    this.formValidatorRules$ = this.store.select(FormResponseSelectors.selectFormValidatorRules);
  }

  ngOnInit(): void {
    console.log('�� FormsComponent ngOnInit - iniciando...');
    
    this.store.dispatch(FormResponseActions.fetchAllForms());
    console.log('✅ FormsComponent initialized and fetchAllForms dispatched');
    
    // Suscribirse a los cambios en los formularios para debug
    const formsSub = this.forms$.subscribe(forms => {
      console.log('📋 Formularios cargados en componente:', forms);
      console.log('📊 Cantidad de formularios:', forms?.length || 0);
      
      // Solo agregar datos de prueba si realmente no hay formularios del backend
      // y han pasado más de 3 segundos (para dar tiempo al backend)
      if (!forms || forms.length === 0) {
        setTimeout(() => {
          this.store.select(FormResponseSelectors.selectForms).subscribe(currentForms => {
            if (!currentForms || currentForms.length === 0) {
              console.log('⏰ No se recibieron formularios del backend después de 3 segundos, agregando datos de prueba...');
              this.addTestForms();
            }
          });
        }, 3000);
      }
    });
    
    this.subscriptions.push(formsSub);
  }

  // ===== MÉTODOS PARA FORMULARIO DINÁMICO =====

  // Toggle the visibility of the specified section
  toggleSection(section: 'materia' | 'produccion') {
    this.showMateria = section === 'materia' ? !this.showMateria : false;
    this.showProduccion = section === 'produccion' ? !this.showProduccion : false;
  }

  // Open the modal with the specified form
  openModal(form: any) {
    console.log('🎯 openModal llamado con form:', form);
    console.log('🎯 Tipo de form:', typeof form);
    console.log('🎯 Propiedades de form:', Object.keys(form || {}));
    
    // Crear una copia inmutable del formulario para evitar mutaciones
    this.selectedForm = { ...form };
    this.modalTitle = form.title || form.name || 'Formulario';
    this.modalVisible = true;
    this.selectedBatchId = null; // Reset batch selection
    this.batchesSearchText = ''; // Reset search
    
    console.log('🎯 selectedForm asignado (copia inmutable):', this.selectedForm);
    console.log('🎯 modalTitle:', this.modalTitle);
    console.log('🎯 modalVisible:', this.modalVisible);
    
    // Cargar lotes disponibles
    this.loadBatches();
    
    // Cargar campos y reglas de validación específicas para este formulario
    if (form && form.id) {
      console.log('🎯 Cargando campos para form.id:', form.id);
      this.loadFormFields(form.id);
      
      console.log('🎯 Cargando reglas de validación para form.id:', form.id);
      this.loadValidationRules(form.id);
    } else {
      console.log('⚠️ No se puede cargar campos/reglas - form.id no existe');
    }
  }

  // Cargar lotes disponibles
  private loadBatches(): void {
    this.loadingBatches = true;
    this.batchesService.list({}, 1, 999).subscribe({
      next: (response: any) => {
        this.batches = response.data || response || [];
        this.filteredBatches = this.batches;
        console.log('✅ Lotes cargados:', this.batches.length);
        this.loadingBatches = false;
      },
      error: (err) => {
        console.error('❌ Error cargando lotes:', err);
        this.batches = [];
        this.filteredBatches = [];
        this.loadingBatches = false;
        this.alertService.error('Error cargando lotes', err?.message || 'Error desconocido');
      }
    });
  }

  // Filtrar lotes según búsqueda
  filterBatches(): void {
    if (!this.batchesSearchText.trim()) {
      this.filteredBatches = this.batches;
      return;
    }
    const search = this.batchesSearchText.toLowerCase();
    this.filteredBatches = this.batches.filter(batch => 
      (batch.name && batch.name.toLowerCase().includes(search)) ||
      (batch.code && batch.code.toLowerCase().includes(search)) ||
      (batch.id && batch.id.toString().includes(search))
    );
  }

  // Obtener texto a mostrar del lote seleccionado
  getSelectedBatchDisplay(): string {
    if (!this.selectedBatchId) return '';
    const batch = this.batches.find(b => b.id === this.selectedBatchId);
    return batch ? `${batch.name || 'Lote'} (${batch.code || '#' + batch.id})` : '';
  }

  // Close the modal
  closeModal() {
    this.modalVisible = false;
    this.selectedForm = null;
    this.selectedFormValidationRules = null;
    this.dynamicForm = this.fb.group({});
    this.loadingFields = false;
    this.submitting = false;
    this.selectedBatchId = null;
    this.batchesSearchText = '';
    this.filteredBatches = [];
    this.batches = [];
    console.log('🎯 Modal cerrado y estado limpiado');
  }

  // Cargar campos de un formulario específico
  loadFormFields(formId: number) {
    this.loadingFields = true;
    this.store.dispatch(FormResponseActions.loadFormFields({ formId }));
    
    // Suscribirse a los campos específicos del formulario
    const fieldsSub = this.store.select(FormResponseSelectors.selectFormFieldsByFormId(formId)).subscribe(fields => {
      if (fields && fields.length > 0) {
        console.log(`✅ Campos cargados para formulario ${formId}:`, fields);
        this.loadingFields = false;
        
        // Crear una nueva copia inmutable del selectedForm con los campos agregados
        if (this.selectedForm && this.selectedForm.id === formId) {
          console.log('🎯 Estado ANTES de agregar campos:', this.selectedForm);
          this.selectedForm = {
            ...this.selectedForm,
            form_fields: [...fields] // Crear copia de los campos también
          };
          console.log('🎯 Estado DESPUÉS de agregar campos:', this.selectedForm);
          console.log('🎯 Campos agregados exitosamente, cantidad:', this.selectedForm.form_fields?.length || 0);
          
          // Construir el formulario dinámico
          this.buildDynamicForm(fields);
          
          // Verificar que el template puede acceder a los datos
          setTimeout(() => {
            console.log('🎯 Verificación post-actualización:');
            console.log('  - selectedForm existe:', !!this.selectedForm);
            console.log('  - selectedForm.id:', this.selectedForm?.id);
            console.log('  - selectedForm.form_fields existe:', !!this.selectedForm?.form_fields);
            console.log('  - cantidad de campos:', this.selectedForm?.form_fields?.length || 0);
            console.log('  - dynamicForm creado:', !!this.dynamicForm);
          }, 100);
        }
      }
    });
    
    this.subscriptions.push(fieldsSub);
  }

  // Cargar reglas de validación para un formulario específico
  loadValidationRules(formId: number) {
    this.store.dispatch(FormResponseActions.loadValidationRules({ formId }));
    
    // Suscribirse a las reglas de validación específicas del formulario
    const validationRulesSub = this.store.select(FormResponseSelectors.selectValidationRulesByFormId(formId)).subscribe(rules => {
      if (rules) {
        this.selectedFormValidationRules = rules;
        console.log(`✅ Reglas de validación cargadas para formulario ${formId}:`, rules);
      }
    });
    
    this.subscriptions.push(validationRulesSub);
  }

  // Construir el formulario dinámico basado en los campos
  buildDynamicForm(fields: any[]): void {
    console.log('📋 buildDynamicForm iniciado con campos:', fields);
    const group: any = {};

    fields.forEach((field, index) => {
      console.log(`📋 Procesando campo ${index}:`, field);
      const validators = this.buildValidators(field);
      const fieldCode = this.getFieldCode(field);
      group[fieldCode] = ['', validators];
      console.log(`📋 Campo agregado: ${fieldCode} con validadores:`, validators);
    });

    console.log('📋 Grupo de formulario construido:', group);
    this.dynamicForm = this.fb.group(group);
    console.log('📋 Formulario dinámico creado:', this.dynamicForm);
  }

  // Construir validadores para un campo
  buildValidators(field: any): any[] {
    console.log('📋 buildValidators para campo:', field);
    const validators = [];
    
    // Validaciones básicas del campo
    if (this.isFieldRequired(field)) {
      validators.push(Validators.required);
      console.log('📋 Agregado validador required');
    }

    const fieldType = this.getFieldType(field);
    switch (fieldType) {
      case 'number':
      case 'integer':
      case 'decimal':
      case 'float':
        validators.push(Validators.pattern(/^-?\d+(?:\.\d+)?$/));
        if (field.min !== undefined) validators.push(Validators.min(field.min));
        if (field.max !== undefined) validators.push(Validators.max(field.max));
        console.log('📋 Agregado validador pattern para number');
        break;
        
      case 'email':
        validators.push(Validators.email);
        console.log('📋 Agregado validador email');
        break;
        
      case 'url':
        validators.push(Validators.pattern(/^https?:\/\/.+/));
        console.log('📋 Agregado validador pattern para URL');
        break;
        
      case 'tel':
      case 'phone':
        if (field.pattern) {
          validators.push(Validators.pattern(field.pattern));
        } else {
          validators.push(Validators.pattern(/^[\+]?[0-9\s\-\(\)]{10,}$/));
        }
        console.log('📋 Agregado validador pattern para teléfono');
        break;
        
      case 'password':
        validators.push(Validators.minLength(field.minLength || 8));
        if (field.requireUppercase !== false) {
          validators.push(Validators.pattern(/^(?=.*[A-Z])/));
        }
        if (field.requireNumbers !== false) {
          validators.push(Validators.pattern(/^(?=.*\d)/));
        }
        console.log('📋 Agregado validadores para password');
        break;
    }

    // Validaciones de longitud para campos de texto
    if (['text', 'string', 'textarea', 'text_area', 'search'].includes(fieldType)) {
      if (field.minLength || field.min_length) {
        validators.push(Validators.minLength(field.minLength || field.min_length));
      }
      if (field.maxLength || field.max_length) {
        validators.push(Validators.maxLength(field.maxLength || field.max_length));
      }
    }

    // Aplicar reglas de validación adicionales si están disponibles
    const fieldCode = this.getFieldCode(field);
    if (this.selectedFormValidationRules && this.selectedFormValidationRules[fieldCode]) {
      const fieldRules = this.selectedFormValidationRules[fieldCode];
      console.log(`📋 Aplicando reglas adicionales para ${fieldCode}:`, fieldRules);
      
      if (fieldRules.minLength) {
        validators.push(Validators.minLength(fieldRules.minLength));
      }
      
      if (fieldRules.maxLength) {
        validators.push(Validators.maxLength(fieldRules.maxLength));
      }
      
      if (fieldRules.pattern) {
        validators.push(Validators.pattern(fieldRules.pattern));
      }
      
      if (fieldRules.min) {
        validators.push(Validators.min(fieldRules.min));
      }
      
      if (fieldRules.max) {
        validators.push(Validators.max(fieldRules.max));
      }
    }

    console.log(`📋 Validadores finales para ${fieldCode}:`, validators);
    return validators;
  }

  // Métodos auxiliares para obtener propiedades de los campos
  getFieldCode(field: any): string {
    return field.field_code || field.name || field.code || 'unknown_field';
  }

  getFieldLabel(field: any): string {
    return field.label || field.title || field.name || 'Campo';
  }

  getFieldType(field: any): string {
    return field.type || field.field_type || 'text';
  }

  getFieldPlaceholder(field: any): string {
    return field.placeholder || field.hint || '';
  }

  getFieldDescription(field: any): string {
    return field.description || field.help || '';
  }

  isFieldRequired(field: any): boolean {
    return field.required === true || field.required === 'true' || field.mandatory === true;
  }

  // Obtener error de un campo específico
  getFieldError(fieldCode: string): string {
    const control = this.dynamicForm?.get(fieldCode);
    if (control?.errors && control?.touched) {
      if (control.errors['required']) return 'Este campo es requerido';
      if (control.errors['email']) return 'Formato de email inválido';
      if (control.errors['pattern']) return 'Formato inválido';
      if (control.errors['minlength']) return `Mínimo ${control.errors['minlength'].requiredLength} caracteres`;
      if (control.errors['maxlength']) return `Máximo ${control.errors['maxlength'].requiredLength} caracteres`;
      if (control.errors['min']) return `Valor mínimo: ${control.errors['min'].min}`;
      if (control.errors['max']) return `Valor máximo: ${control.errors['max'].max}`;
    }
    return '';
  }

  // Enviar formulario dinámico
  onSubmitForm(): void {
    if (!this.dynamicForm || this.dynamicForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      this.markAllFieldsAsTouched();
      console.log('⚠️ Formulario inválido, no se puede enviar');
      return;
    }
    
    // Validar que se haya seleccionado un lote
    if (!this.selectedBatchId) {
      this.alertService.warning('Selecciona un lote', 'Debes seleccionar un lote para enviar el formulario');
      console.log('⚠️ No se ha seleccionado ningún lote');
      return;
    }
    
    this.submitting = true;
    
    const formValue = {
      form_id: this.selectedForm.id,
      batch_id: this.selectedBatchId,
      values: this.dynamicForm.value
    };
    
    console.log('📤 Enviando formulario:', formValue);
    this.store.dispatch(FormResponseActions.submitForm({ formData: formValue }));
    
    // Simular delay y cerrar modal
    setTimeout(() => {
      this.submitting = false;
      this.alertService.success('Formulario enviado correctamente');
      this.closeModal();
    }, 1500);
  }

  // Resetear formulario
  resetForm(): void {
    if (this.dynamicForm) {
      this.dynamicForm.reset();
      console.log('🔄 Formulario reseteado');
    }
  }

  // Marcar todos los campos como touched
  markAllFieldsAsTouched(): void {
    if (this.dynamicForm) {
      Object.keys(this.dynamicForm.controls).forEach(key => {
        this.dynamicForm.get(key)?.markAsTouched();
      });
    }
  }

  // ===== MÉTODOS DE TESTING Y FALLBACK =====

  private addTestForms() {
    const testForms = [
      {
        id: 1,
        name: 'Form_test_1',
        code: 'test_1',
        description: 'test',
        version: 'V0.1',
        category: 'Materia Prima',
        status: 'active'
      },
      {
        id: 2,
        name: 'Formulario de Producción',
        code: 'production_1',
        description: 'Formulario para registro de producción',
        version: 'V1.0',
        category: 'Producción',
        status: 'active'
      }
    ];

    console.log('🧪 Despachando formularios de prueba:', testForms);
    this.store.dispatch(FormResponseActions.fetchAllFormsSuccess({ forms: testForms }));
  }

  onSubmit(): void {
    // Handle form submission
  }

  // Método para manejar el envío del formulario dinámico (mantenido por compatibilidad)
  onFormSubmit(formData: any) {
    console.log('📤 Datos del formulario enviados:', formData);
    this.store.dispatch(FormResponseActions.submitForm({ formData }));
    
    // Opcional: Cerrar modal después del envío
    this.alertService.success('Formulario enviado correctamente');
    this.closeModal();
  }

  // ===== MÉTODOS PARA NUEVOS TIPOS DE INPUT =====

  /**
   * Maneja el cambio en checkboxes múltiples
   */
  onCheckboxChange(event: any, fieldCode: string, value: string): void {
    const formArray = this.dynamicForm.get(fieldCode);
    
    if (event.target.checked) {
      // Agregar valor si está marcado
      const currentValue = formArray?.value || [];
      const newValue = Array.isArray(currentValue) ? [...currentValue, value] : [value];
      this.dynamicForm.patchValue({ [fieldCode]: newValue });
    } else {
      // Remover valor si está desmarcado
      const currentValue = formArray?.value || [];
      const newValue = Array.isArray(currentValue) 
        ? currentValue.filter((item: string) => item !== value) 
        : [];
      this.dynamicForm.patchValue({ [fieldCode]: newValue });
    }
    
    console.log(`✅ Checkbox ${fieldCode} actualizado:`, this.dynamicForm.get(fieldCode)?.value);
  }

  /**
   * Maneja la carga de archivos
   */
  onFileChange(event: any, fieldCode: string): void {
    const files = event.target.files;
    
    if (files && files.length > 0) {
      // Para archivos únicos, guardar solo el primer archivo
      // Para múltiples archivos, guardar todos
      const fieldValue = event.target.multiple ? Array.from(files) : files[0];
      
      this.dynamicForm.patchValue({ [fieldCode]: fieldValue });
      
      console.log(`📎 Archivo(s) seleccionado(s) para ${fieldCode}:`, fieldValue);
      
      // Validar tamaño de archivo si está especificado
      this.validateFileSize(files, fieldCode);
    }
  }

  /**
   * Valida el tamaño de los archivos
   */
  private validateFileSize(files: FileList, fieldCode: string): void {
    const maxSize = 5 * 1024 * 1024; // 5MB por defecto
    
    Array.from(files).forEach((file: File) => {
      if (file.size > maxSize) {
        this.alertService.error(`El archivo ${file.name} excede el tamaño máximo permitido (5MB)`);
        // Limpiar el campo
        this.dynamicForm.patchValue({ [fieldCode]: null });
      }
    });
  }

  /**
   * Obtiene el tipo MIME aceptado para archivos
   */
  getAcceptedFileTypes(field: any): string {
    if (this.getFieldType(field) === 'image') {
      return 'image/*';
    }
    return field.accept || '*/*';
  }

  /**
   * Formatea el valor mostrado para inputs de rango
   */
  formatRangeValue(fieldCode: string, field: any): string {
    const value = this.dynamicForm.get(fieldCode)?.value;
    const suffix = field.suffix || '';
    const prefix = field.prefix || '';
    
    return `${prefix}${value || field.min || 0}${suffix}`;
  }

  /**
   * Obtiene el texto de ayuda para tipos específicos de campos
   */
  getFieldHelpText(field: any): string {
    const type = this.getFieldType(field);
    
    switch (type) {
      case 'password':
        return 'Mínimo 8 caracteres, incluya mayúsculas, minúsculas y números';
      case 'tel':
      case 'phone':
        return 'Formato: +52 55 1234 5678';
      case 'url':
        return 'Incluya http:// o https://';
      case 'file':
        return `Tamaño máximo: ${field.maxSize || '5MB'}`;
      case 'image':
        return 'Formatos: JPG, PNG, GIF. Máximo 5MB';
      case 'color':
        return 'Seleccione un color de la paleta';
      case 'range':
        return `Rango: ${field.min || 0} - ${field.max || 100}`;
      default:
        return this.getFieldDescription(field);
    }
  }

  /**
   * Determina si un campo debe ocupar el ancho completo
   */
  isFullWidthField(field: any): boolean {
    const type = this.getFieldType(field);
    const fullWidthTypes = ['textarea', 'text_area', 'file', 'image', 'range', 'color'];
    return fullWidthTypes.includes(type) || field.fullWidth === true;
  }

  /**
   * Obtiene la clase CSS para el tamaño de la columna
   */
  getColumnClass(field: any): string {
    if (this.isFullWidthField(field)) {
      return 'col-12';
    }
    return 'col-12 col-md-6';
  }

  /**
   * Verifica si un campo es de tipo fecha/hora
   */
  isDateTimeField(field: any): boolean {
    const type = this.getFieldType(field);
    const dateTimeTypes = ['date', 'time', 'datetime-local', 'datetime', 'month', 'week'];
    return dateTimeTypes.includes(type);
  }

  /**
   * Obtiene el icono FontAwesome apropiado para cada tipo de campo
   */
  getFieldIcon(field: any): string {
    const type = this.getFieldType(field);
    
    const iconMap: { [key: string]: string } = {
      'text': 'fas fa-font',
      'string': 'fas fa-font',
      'email': 'fas fa-envelope',
      'password': 'fas fa-lock',
      'number': 'fas fa-hashtag',
      'integer': 'fas fa-hashtag',
      'decimal': 'fas fa-calculator',
      'float': 'fas fa-calculator',
      'tel': 'fas fa-phone',
      'phone': 'fas fa-phone',
      'url': 'fas fa-link',
      'search': 'fas fa-search',
      'date': 'fas fa-calendar',
      'time': 'fas fa-clock',
      'datetime-local': 'fas fa-calendar-alt',
      'datetime': 'fas fa-calendar-alt',
      'month': 'fas fa-calendar-check',
      'week': 'fas fa-calendar-week',
      'textarea': 'fas fa-align-left',
      'text_area': 'fas fa-align-left',
      'select': 'fas fa-list',
      'dropdown': 'fas fa-list',
      'checkbox': 'fas fa-check-square',
      'radio': 'fas fa-dot-circle',
      'file': 'fas fa-file-upload',
      'image': 'fas fa-image',
      'range': 'fas fa-sliders-h',
      'color': 'fas fa-palette',
      'hidden': 'fas fa-eye-slash'
    };
    
    return iconMap[type] || 'fas fa-question-circle';
  }

  // ===== MÉTODOS HELPER PARA NUEVO UI =====

  /**
   * Cuenta formularios activos
   */
  getActiveFormsCount(forms: any[]): number {
    if (!forms) return 0;
    return forms.filter(f => f.status === 'active' || !f.status).length;
  }

  /**
   * Obtiene el progreso del formulario (campos completados / total)
   */
  getFormProgress(): number {
    if (!this.selectedForm?.form_fields || !this.dynamicForm) return 0;
    const totalFields = this.selectedForm.form_fields.length;
    if (totalFields === 0) return 0;
    const completedFields = this.getCompletedFieldsCount();
    return Math.round((completedFields / totalFields) * 100);
  }

  /**
   * Cuenta campos completados
   */
  getCompletedFieldsCount(): number {
    if (!this.selectedForm?.form_fields || !this.dynamicForm) return 0;
    let count = 0;
    this.selectedForm.form_fields.forEach((field: any) => {
      const fieldCode = this.getFieldCode(field);
      const value = this.dynamicForm.get(fieldCode)?.value;
      if (value !== null && value !== undefined && value !== '') {
        count++;
      }
    });
    return count;
  }

  /**
   * Verifica si el campo es de tipo input text-like
   */
  isTextInputField(field: any): boolean {
    const type = this.getFieldType(field);
    const textTypes = ['text', 'string', 'email', 'password', 'tel', 'phone', 'url', 'search'];
    return textTypes.includes(type);
  }

  /**
   * Retorna el tipo HTML de input correcto
   */
  getInputType(field: any): string {
    const type = this.getFieldType(field);
    const typeMap: { [key: string]: string } = {
      'string': 'text',
      'phone': 'tel',
      'integer': 'number',
      'decimal': 'number',
      'float': 'number'
    };
    return typeMap[type] || type;
  }

  /**
   * Verifica si el campo es numérico
   */
  isNumericField(field: any): boolean {
    const type = this.getFieldType(field);
    const numericTypes = ['number', 'integer', 'decimal', 'float'];
    return numericTypes.includes(type);
  }

  /**
   * Verifica si el valor del campo está llenado
   */
  isFieldFilled(fieldCode: string): boolean {
    const value = this.dynamicForm?.get(fieldCode)?.value;
    return value !== null && value !== undefined && value !== '';
  }

  /**
   * Verifica si el campo tiene errores
   */
  hasFieldError(fieldCode: string): boolean {
    const control = this.dynamicForm?.get(fieldCode);
    return !!(control?.invalid && control?.touched);
  }

  /**
   * Obtiene el valor actual del campo para caracteres restantes
   */
  getFieldLength(fieldCode: string): number {
    return this.dynamicForm?.get(fieldCode)?.value?.length || 0;
  }

  /**
   * Obtiene el máximo de caracteres permitidos
   */
  getMaxLength(field: any): number {
    return field.maxLength || field.max_length || 0;
  }

  /**
   * Verifica si el checkbox está marcado
   */
  isChecked(fieldCode: string, value: string): boolean {
    const currentValue = this.dynamicForm?.get(fieldCode)?.value;
    if (Array.isArray(currentValue)) {
      return currentValue.includes(value);
    }
    return currentValue === value;
  }

  /**
   * Obtiene categorías únicas de formularios
   */
  getCategoriesCount(forms: any[]): number {
    if (!forms) return 0;
    const categories = new Set(forms.map(f => f.category || 'Sin categoría'));
    return categories.size;
  }

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
