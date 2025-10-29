import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { Forms, FormsFiles } from '../../model/forms.model';
import { Store } from '@ngrx/store';
import { AlertService } from 'src/app/core/services/alert.service';

import * as FormSelectors from '../../store/selectors/forms.selectors';
import * as FormActions from '../../store/actions/forms.actions';
import * as FormFilesSelectors from '../../store/selectors/formFiles.selectros';
import * as FormFilesActions from '../../store/actions/fromFiles.actions';


@Component({
  selector: 'app-forms-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forms-manager.component.html',
  styleUrls: ['./forms-manager.component.scss']
})
export class FormsManagerComponent implements OnInit, OnDestroy {

  forms$: Observable<Forms[]>;
  formFiles$: Observable<FormsFiles[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

  // Modal details
  showDetailsModal = false;
  selectedForm: Forms | null = null;
  selectedFormFiles: FormsFiles[] = [];

  // Edit mode form files
  editFormFiles: FormsFiles[] = [];
  currentEditingFileIndex: number = 0;

  private subscription: Subscription[] = [];

  user: any = null;
  // Estado de modales
  showFormModal = false;
  isEditMode = false;

  // Formulario en edición o creación
  newForm: Forms = {
    id: undefined,
    name: '',
    code: '',
    description: '',
    version: '1.0',
    created_by: 11,
    is_active: true,
    display_order: 0
  };

  newFormFile: FormsFiles = {
    id: undefined,
    label: '',
    field_code: '',
    type: '',
    required: false,
    options: [],
    validation_rules: [],
    field_order: 0,
    is_active: true
  };

  // Propiedades auxiliares para el formulario
  optionsText: string = '';
  validationRulesText: string = '';


  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.forms$ = this.store.select(FormSelectors.selectAllForms);
    this.loading$ = this.store.select(FormSelectors.selectFormsLoading);
    this.error$ = this.store.select(FormSelectors.selectFormsError);

    this.formFiles$ = this.store.select(FormFilesSelectors.selectAllFormFiles);
  }

  ngOnInit(): void {

    const storedUser = localStorage.getItem('currentUser');
    if (storedUser) {
      this.user = JSON.parse(storedUser);
      console.log("Usuario logueado:", this.user);
    }

    console.log('🚀 FormsManagerComponent initialized');
    console.log('📡 Dispatching getForms action...');
    this.store.dispatch(FormActions.getForms());
    
    // Subscribe to forms to get the first form's ID and dispatch getFormFiles
    const formsSubscription = this.forms$.subscribe(forms => {
      if (forms && forms.length > 0 && forms[0]?.id) {
        this.store.dispatch(FormFilesActions.getFormFiles({ formId: forms[0].id }));
      }
    });
    this.subscription.push(formsSubscription);

    // Debug subscriptions
    this.forms$.subscribe(forms => {
      console.log('📝 Forms data received:', forms);
    });

    this.formFiles$.subscribe(files => {
      console.log('📝 Form files data received:', files);
    });

    this.loading$.subscribe(loading => {
      console.log('⏳ Loading state:', loading);
    });

    this.error$.subscribe(error => {
      console.log('❌ Error state:', error);
    });
  }

  openCreateModal() {
    this.isEditMode = false;
    this.newForm = {
      id: undefined,
      name: '',
      code: '',
      description: '',
      version: '1.0',
      created_by: this.user?.id ?? null,
      is_active: true,
      display_order: 0
    };
    this.newFormFile = {
      id: undefined,
      label: '',
      field_code: '',
      type: '',
      required: false,
      options: [],
      validation_rules: [],
      field_order: 0,
      is_active: true
    };
    // Reset auxiliary properties
    this.optionsText = '';
    this.validationRulesText = '';
    this.showFormModal = true;
  }

  openEditModal(form: Forms, file?: FormsFiles) {
    // Validate that form is not null
    if (!form) {
      console.error('❌ Error: No se puede abrir el modal de edición - formulario es null');
      this.alertService.toast('error', 'Error al cargar el formulario');
      return;
    }

    this.isEditMode = true;
    this.newForm = { ...form };
    
    console.log('📝 Abriendo modal de edición para formulario:', form.name || 'Sin nombre');
    
    // Clear previous form files data first
    this.clearFormFilesStorage();
    
    // Load all form files for this form
    if (form.id) {
      console.log('🔄 Cargando campos del formulario ID:', form.id);
      this.store.dispatch(FormFilesActions.getFormFiles({ formId: form.id }));
      
      // Wait a moment for the store to load, then subscribe to get the files
      setTimeout(() => {
        const editFormFilesSubscription = this.formFiles$.subscribe(files => {
          this.editFormFiles = files || [];
          console.log('📋 Campos cargados para edición:', this.editFormFiles);
          
          // If a specific file is provided, use it; otherwise use the first file or create a new one
          if (file) {
            this.loadFileForEditing(file);
          } else if (this.editFormFiles.length > 0) {
            // Load the first file by default
            this.loadFileForEditing(this.editFormFiles[0]);
            this.currentEditingFileIndex = 0;
          } else {
            // No files exist, create a new one
            this.loadFileForEditing(null);
            this.currentEditingFileIndex = -1; // Indicates new file
          }
        });
        this.subscription.push(editFormFilesSubscription);
      }, 150);
    } else {
      // New form, no files to load
      this.loadFileForEditing(null);
      this.editFormFiles = [];
      this.currentEditingFileIndex = -1;
    }
    
    this.showFormModal = true;
  }

  private loadFileForEditing(file: FormsFiles | null) {
    if (file) {
      this.newFormFile = { ...file };
      // Convert arrays to text for editing
      this.optionsText = this.newFormFile.options?.join(', ') || '';
      this.validationRulesText = this.newFormFile.validation_rules ? JSON.stringify(this.newFormFile.validation_rules) : '';
      console.log('✏️ Cargando campo para edición:', file.label || 'Sin etiqueta');
    } else {
      // Default empty FormsFiles for creating a new field
      this.newFormFile = {
        id: undefined,
        label: '',
        field_code: '',
        type: '',
        required: false,
        options: [],
        validation_rules: [],
        field_order: this.editFormFiles?.length || 0, // Set order to next available
        is_active: true
      };
      this.optionsText = '';
      this.validationRulesText = '';
      console.log('➕ Preparando nuevo campo para el formulario');
    }
  }

  viewFormDetails(id: number) {
    // Validate ID
    if (!id || id <= 0) {
      console.error('❌ Error: ID de formulario inválido:', id);
      this.alertService.toast('error', 'ID de formulario inválido');
      return;
    }

    console.log('📋 Viendo detalles del formulario con ID:', id);
    
    // Clear previous form files data first
    this.clearFormFilesStorage();
    
    // Find the selected form
    this.forms$.subscribe(forms => {
      this.selectedForm = forms.find(form => form.id === id) || null;
      if (this.selectedForm) {
        console.log('✅ Formulario seleccionado:', this.selectedForm);
        
        // Small delay to ensure the store is cleared before loading new data
        setTimeout(() => {
          // Dispatch action to get form files for this specific form
          this.store.dispatch(FormFilesActions.getFormFiles({ formId: id }));
          
          // Subscribe to form files to get the files for this form
          const formFilesSubscription = this.formFiles$.subscribe(files => {
            this.selectedFormFiles = files || [];
            console.log('📁 Archivos del formulario:', this.selectedFormFiles);
          });
          this.subscription.push(formFilesSubscription);
        }, 100);
        
        // Show the details modal
        this.showDetailsModal = true;
      } else {
        console.error('❌ No se encontró el formulario con ID:', id);
        this.alertService.toast('error', 'Formulario no encontrado');
      }
    }).unsubscribe(); // Unsubscribe immediately after getting the data
  }

  closeFormModal() {
    this.showFormModal = false;
    // Clear edit form files when closing
    this.editFormFiles = [];
    this.currentEditingFileIndex = 0;
  }

  // Navigation methods for editing multiple fields
  goToNextField() {
    if (this.currentEditingFileIndex < this.editFormFiles.length - 1) {
      this.currentEditingFileIndex++;
      this.loadFileForEditing(this.editFormFiles[this.currentEditingFileIndex]);
    }
  }

  goToPreviousField() {
    if (this.currentEditingFileIndex > 0) {
      this.currentEditingFileIndex--;
      this.loadFileForEditing(this.editFormFiles[this.currentEditingFileIndex]);
    }
  }

  addNewField() {
    this.currentEditingFileIndex = -1; // Indicates new field
    this.loadFileForEditing(null);
  }

  deleteCurrentField() {
    if (this.newFormFile.id && this.currentEditingFileIndex >= 0) {
      this.alertService.confirm('¿Estás seguro?', 'Esta acción eliminará el campo del formulario')
        .then((result) => {
          if (result.isConfirmed) {
            console.log('🗑️ Eliminando campo:', this.newFormFile.label);
            this.store.dispatch(FormFilesActions.deleteFormFile({ fileId: this.newFormFile.id! }));
            
            // Remove from local array and adjust index
            this.editFormFiles.splice(this.currentEditingFileIndex, 1);
            
            if (this.editFormFiles.length === 0) {
              // No more fields, create new one
              this.addNewField();
            } else {
              // Adjust index and load appropriate field
              if (this.currentEditingFileIndex >= this.editFormFiles.length) {
                this.currentEditingFileIndex = this.editFormFiles.length - 1;
              }
              this.loadFileForEditing(this.editFormFiles[this.currentEditingFileIndex]);
            }
            
            this.alertService.toast('success', 'Campo eliminado');
          }
        });
    }
  }

  closeDetailsModal() {
    this.showDetailsModal = false;
    this.selectedForm = null;
    this.selectedFormFiles = [];
    // Clear the form files store to prevent data mixing
    this.clearFormFilesStorage();
  }

  private clearFormFilesStorage() {
    // Dispatch an action to clear form files from the store
    // This prevents old data from showing when viewing different forms
    console.log('🧹 Clearing form files storage...');
    this.store.dispatch(FormFilesActions.clearFormFiles());
  }

  onSubmit() {
    // Process auxiliary properties before submitting
    this.processFormData();
    
    if (this.isEditMode) {
      // Update the form
      this.store.dispatch(FormActions.putForm({ id: this.newForm.id!, formData: this.newForm }));
      
      // Handle form file update/creation
      if (this.currentEditingFileIndex === -1) {
        // Creating a new field
        console.log('➕ Creando nuevo campo:', this.newFormFile.label);
        
        // Convert FormsFiles to FormData for new field
        const formData = new FormData();
        formData.append('label', this.newFormFile.label);
        formData.append('field_code', this.newFormFile.field_code);
        formData.append('type', this.newFormFile.type);
        formData.append('required', this.newFormFile.required.toString());
        formData.append('options', JSON.stringify(this.newFormFile.options));
        formData.append('validation_rules', JSON.stringify(this.newFormFile.validation_rules));
        formData.append('field_order', this.newFormFile.field_order.toString());
        formData.append('is_active', this.newFormFile.is_active.toString());
        
        this.store.dispatch(FormFilesActions.uploadFormFile({ formId: this.newForm.id!, fileData: formData }));
      } else {
        // Updating existing field
        console.log('✏️ Actualizando campo:', this.newFormFile.label);
        this.store.dispatch(FormFilesActions.updateFormFile({ id: this.newFormFile.id!, formFileData: this.newFormFile }));
      }
    } else {
      // Creating new form
      this.store.dispatch(FormActions.postForm({ formData: this.newForm }));
      
      // Only create form field if there's actually data
      if (this.newFormFile.label.trim() || this.newFormFile.field_code.trim()) {
        // Convert FormsFiles to FormData
        const formData = new FormData();
        formData.append('label', this.newFormFile.label);
        formData.append('field_code', this.newFormFile.field_code);
        formData.append('type', this.newFormFile.type);
        formData.append('required', this.newFormFile.required.toString());
        formData.append('options', JSON.stringify(this.newFormFile.options));
        formData.append('validation_rules', JSON.stringify(this.newFormFile.validation_rules));
        formData.append('field_order', this.newFormFile.field_order.toString());
        formData.append('is_active', this.newFormFile.is_active.toString());
        
        this.store.dispatch(FormFilesActions.uploadFormFile({ formId: this.newForm.id!, fileData: formData }));
      }
    }
    this.closeFormModal();
  }

  private processFormData() {
    // Convert options text to array
    if (this.optionsText.trim()) {
      this.newFormFile.options = this.optionsText.split(',').map(option => option.trim()).filter(option => option.length > 0);
    } else {
      this.newFormFile.options = [];
    }

    // Convert validation rules text to object
    if (this.validationRulesText.trim()) {
      try {
        this.newFormFile.validation_rules = JSON.parse(this.validationRulesText);
      } catch (error) {
        console.warn('Invalid JSON for validation rules:', error);
        this.newFormFile.validation_rules = [];
      }
    } else {
      this.newFormFile.validation_rules = [];
    }
  }

  deleteForm(id: number): void {
    // Validate ID
    if (!id || id <= 0) {
      console.error('❌ Error: ID de formulario inválido para eliminar:', id);
      this.alertService.toast('error', 'ID de formulario inválido');
      return;
    }

    this.alertService.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer')
      .then((result) => {
        if (result.isConfirmed) {
          console.log('🗑️ Eliminando formulario con ID:', id);
          this.store.dispatch(FormActions.deleteForm({ id }));
          this.alertService.toast('success', 'Formulario eliminado');
        } else {
          this.alertService.toast('info', 'Eliminación cancelada');
        }
      })
      .catch((error) => {
        console.error('❌ Error en confirmación de eliminación:', error);
        this.alertService.toast('error', 'Error al procesar la eliminación');
      });
  }

  /**
   * Improved field type display with emojis and better names
   */
  getFieldTypeDisplay(type: string): string {
    const fieldTypes: { [key: string]: string } = {
      'text': '📝 Texto',
      'email': '📧 Email',
      'number': '🔢 Número',
      'tel': '📞 Teléfono',
      'password': '🔒 Contraseña',
      'textarea': '📄 Área de Texto',
      'select': '📋 Lista Desplegable',
      'radio': '🔘 Botones de Radio',
      'checkbox': '☑️ Casillas de Verificación',
      'date': '📅 Fecha',
      'time': '⏰ Hora',
      'file': '📎 Archivo'
    };
    
    return fieldTypes[type] || `❓ ${type}`;
  }

  /**
   * Track by function for better performance in *ngFor
   */
  trackByFormId(index: number, item: Forms): number {
    return item.id || index;
  }

  /**
   * Track by function for form files
   */
  trackByFieldId(index: number, item: FormsFiles): number {
    return item.id || index;
  }

  ngOnDestroy(): void {
    // Unsubscribe from all subscriptions to prevent memory leaks
    this.subscription.forEach(sub => {
      if (sub) {
        sub.unsubscribe();
      }
    });
    this.subscription = [];
    
    // Clear form files storage when component is destroyed
    this.clearFormFilesStorage();
    
    console.log('🧹 FormsManagerComponent destroyed and cleaned up');
  }
}
