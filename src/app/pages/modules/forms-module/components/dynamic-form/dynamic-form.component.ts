import { Component, Input, OnInit, Output, EventEmitter, OnChanges, SimpleChanges, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductionForm, FormField } from 'src/app/store/models/production.model';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicFormComponent implements OnInit, OnChanges {
  @Input() formData: any; // Cambiamos de ProductionForm a any para más flexibilidad
  @Input() validationRules: any = null;
  @Output() formSubmit = new EventEmitter<any>();
  
  dynamicForm!: FormGroup;

  constructor(
    private fb: FormBuilder,
    private cdr: ChangeDetectorRef
  ) {
    console.log('🎨 DynamicFormComponent constructor ejecutado');
  }

  ngOnInit(): void {
    console.log('🎨 DynamicFormComponent ngOnInit iniciado');
    console.log('🎨 formData recibido:', this.formData);
    console.log('🎨 Tipo de formData:', typeof this.formData);
    console.log('🎨 formData es null/undefined?', this.formData == null);
    
    if (this.formData) {
      console.log('🎨 Estructura completa del formData:', JSON.stringify(this.formData, null, 2));
      console.log('🎨 Propiedades de formData:', Object.keys(this.formData));
    }
    
    console.log('🎨 validationRules recibido:', this.validationRules);
    console.log('🎨 Tipo de validationRules:', typeof this.validationRules);
    
    this.initializeForm();
  }

  ngOnChanges(changes: SimpleChanges): void {
    console.log('🎨 DynamicFormComponent ngOnChanges ejecutado');
    console.log('🎨 Cambios detectados:', changes);
    
    // Verificar cambios en formData
    if (changes['formData']) {
      console.log('🎨 Cambio en formData detectado:');
      console.log('  - Valor anterior:', changes['formData'].previousValue);
      console.log('  - Valor actual:', changes['formData'].currentValue);
      console.log('  - Es primer cambio:', changes['formData'].firstChange);
      
      if (!changes['formData'].firstChange) {
        console.log('🎨 Reconstruyendo formulario por cambio en formData');
        this.initializeForm();
      }
    }
    
    // Verificar cambios en validationRules
    if (changes['validationRules']) {
      console.log('🎨 Cambio en validationRules detectado:');
      console.log('  - Valor anterior:', changes['validationRules'].previousValue);
      console.log('  - Valor actual:', changes['validationRules'].currentValue);
      console.log('  - Es primer cambio:', changes['validationRules'].firstChange);
      
      if (!changes['validationRules'].firstChange) {
        console.log('🎨 Reconstruyendo formulario por cambio en validationRules');
        this.initializeForm();
      }
    }
  }

  initializeForm(): void {
    console.log('🎨 initializeForm iniciado');
    console.log('🎨 formData en initializeForm:', this.formData);
    console.log('🎨 formData existe?', !!this.formData);
    
    if (this.formData) {
      // Buscar form_fields en diferentes posibles ubicaciones
      let fields = this.formData.form_fields || 
                   this.formData.fields || 
                   this.formData.formFields || 
                   [];
      
      console.log('🎨 Campos encontrados:', fields);
      console.log('🎨 Tipo de campos:', typeof fields);
      console.log('🎨 Es array?', Array.isArray(fields));
      console.log('🎨 Cantidad de campos:', fields?.length || 0);
      
      if (fields && Array.isArray(fields) && fields.length > 0) {
        console.log('🎨 Construyendo formulario con', fields.length, 'campos');
        this.buildForm(fields);
        // Forzar detección de cambios
        this.cdr.detectChanges();
      } else {
        console.log('⚠️ No se encontraron campos válidos en el formulario');
        console.log('🎨 Propiedades disponibles en formData:', Object.keys(this.formData));
        // Crear un formulario básico para mostrar algo
        this.dynamicForm = this.fb.group({});
        console.log('🎨 Formulario básico vacío creado');
        this.cdr.detectChanges();
      }
    } else {
      console.log('⚠️ No hay formData disponible en initializeForm');
      this.dynamicForm = this.fb.group({});
    }
  }

  buildForm(fields: any[]): void {
    console.log('📋 buildForm iniciado con fields:', fields);
    const group: any = {};

    fields.forEach((field, index) => {
      console.log(`📋 Procesando campo ${index}:`, field);
      const validators = this.buildValidators(field);
      const fieldCode = field.field_code || field.name || field.code || `field_${index}`;
      group[fieldCode] = ['', validators];
      console.log(`📋 Campo agregado: ${fieldCode} con validadores:`, validators);
    });

    console.log('📋 Grupo de formulario construido:', group);
    this.dynamicForm = this.fb.group(group);
    console.log('📋 Formulario dinámico creado:', this.dynamicForm);
  }

  buildValidators(field: any): any[] {
    console.log('📋 buildValidators para campo:', field);
    const validators = [];
    
    // Validaciones básicas del campo
    if (field.required) {
      validators.push(Validators.required);
      console.log('📋 Agregado validador required');
    }

    const fieldType = field.type || field.field_type || 'text';
    switch (fieldType) {
      case 'number':
        validators.push(Validators.pattern(/^-?\d+(?:\.\d+)?$/));
        console.log('📋 Agregado validador pattern para number');
        break;
      case 'email':
        validators.push(Validators.email);
        console.log('📋 Agregado validador email');
        break;
    }

    // Aplicar reglas de validación adicionales si están disponibles
    const fieldCode = field.field_code || field.name || field.code;
    if (this.validationRules && this.validationRules[fieldCode]) {
      const fieldRules = this.validationRules[fieldCode];
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

  submit(): void {
    if (this.dynamicForm.invalid) {
      // Marcar todos los campos como touched para mostrar errores
      this.markAllFieldsAsTouched();
      return;
    }
    
    const formValue = {
      formId: this.formData.id,
      formName: this.formData.name,
      data: this.dynamicForm.value
    };
    
    console.log('📤 Respuesta enviada:', formValue);
    this.formSubmit.emit(formValue);
  }

  markAllFieldsAsTouched(): void {
    Object.keys(this.dynamicForm.controls).forEach(key => {
      this.dynamicForm.get(key)?.markAsTouched();
    });
  }

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

  // Métodos auxiliares para flexibilidad de datos
  getFields(): any[] {
    if (!this.formData) return [];
    return this.formData.form_fields || 
           this.formData.fields || 
           this.formData.formFields || 
           [];
  }

  getFieldsSource(): string {
    if (!this.formData) return 'Sin formData';
    if (this.formData.form_fields) return 'form_fields';
    if (this.formData.fields) return 'fields';
    if (this.formData.formFields) return 'formFields';
    return 'Ninguna propiedad encontrada';
  }

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
}
