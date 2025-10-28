import { Component, Input, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ProductionForm, FormField } from 'src/app/store/models/production.model';

@Component({
  selector: 'app-dynamic-form',
  templateUrl: './dynamic-form.component.html',
  styleUrls: ['./dynamic-form.component.scss']
})
export class DynamicFormComponent implements OnInit {
  @Input() formData!: ProductionForm;
  dynamicForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    if (this.formData?.form_fields) {
      this.buildForm(this.formData.form_fields);
    }
  }

  buildForm(fields: FormField[]): void {
    const group: any = {};

    fields.forEach(field => {
      const validators = [];
      if (field.required) validators.push(Validators.required);

      switch (field.type) {
        case 'number':
          validators.push(Validators.pattern(/^-?\d+(?:\.\d+)?$/));
          break;
        case 'email':
          validators.push(Validators.email);
          break;
      }

      group[field.field_code] = ['', validators];
    });

    this.dynamicForm = this.fb.group(group);
  }

  submit(): void {
    if (this.dynamicForm.invalid) return;
    console.log('📤 Respuesta enviada:', this.dynamicForm.value);
  }
}
