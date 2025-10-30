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

  // Formulario dinámico
  dynamicForm!: FormGroup;

  constructor(
    private store: Store,
    private alertService: AlertService,
    private fb: FormBuilder
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
    
    console.log('🎯 selectedForm asignado (copia inmutable):', this.selectedForm);
    console.log('🎯 modalTitle:', this.modalTitle);
    console.log('🎯 modalVisible:', this.modalVisible);
    
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

  // Close the modal
  closeModal() {
    this.modalVisible = false;
    this.selectedForm = null;
    this.selectedFormValidationRules = null;
    this.dynamicForm = this.fb.group({});
    console.log('🎯 Modal cerrado y estado limpiado');
  }

  // Cargar campos de un formulario específico
  loadFormFields(formId: number) {
    this.store.dispatch(FormResponseActions.loadFormFields({ formId }));
    
    // Suscribirse a los campos específicos del formulario
    const fieldsSub = this.store.select(FormResponseSelectors.selectFormFieldsByFormId(formId)).subscribe(fields => {
      if (fields && fields.length > 0) {
        console.log(`✅ Campos cargados para formulario ${formId}:`, fields);
        
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
        validators.push(Validators.pattern(/^-?\d+(?:\.\d+)?$/));
        console.log('📋 Agregado validador pattern para number');
        break;
      case 'email':
        validators.push(Validators.email);
        console.log('📋 Agregado validador email');
        break;
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
    
    const formValue = {
      form_id: this.selectedForm.id,
      values: this.dynamicForm.value
    };
    
    console.log('📤 Enviando formulario:', formValue);
    this.store.dispatch(FormResponseActions.submitForm({ formData: formValue }));
    
    // Mostrar mensaje de éxito y cerrar modal
    this.alertService.success('Formulario enviado correctamente');
    this.closeModal();
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

  ngOnDestroy(): void {
    // Cleanup subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }
}
