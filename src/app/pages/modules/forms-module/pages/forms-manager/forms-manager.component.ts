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
  
  // Variable to keep reference to form when adding fields
  targetFormForNewField: Forms | null = null;

  // Edit mode form files
  editFormFiles: FormsFiles[] = [];
  currentEditingFileIndex: number = 0;

  // Advanced field editor
  showAdvancedFieldEditor = false;

  private subscription: Subscription[] = [];

  user: any = null;
  // Estado de modales
  showFormModal = false;
  isEditMode = false;
  isAddFieldMode = false; // Nueva propiedad para distinguir modo agregar campo

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
      console.log('📝 Number of files:', files?.length || 0);
    });

    // Monitor store state changes for debugging
    this.loading$.subscribe(loading => {
      console.log('⏳ Loading state:', loading);
    });

    this.error$.subscribe(error => {
      if (error) {
        console.error('❌ Error state:', error);
        this.alertService.toast('error', `Error: ${error}`);
      }
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
    this.isAddFieldMode = false; // Reset mode
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
          this.editFormFiles = this.sortFormFilesByOrder(files || []);
          console.log('📋 Campos cargados para edición ordenados:', this.editFormFiles);
          
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
      // Create a deep copy to avoid read-only property issues
      this.newFormFile = {
        id: file.id,
        label: file.label,
        field_code: file.field_code,
        type: file.type,
        required: file.required,
        options: [...(file.options || [])],
        validation_rules: [...(file.validation_rules || [])],
        field_order: file.field_order,
        is_active: file.is_active
      };
      // Convert arrays to text for editing - use line breaks for options
      this.optionsText = this.newFormFile.options?.join('\n') || '';
      this.validationRulesText = this.newFormFile.validation_rules?.join('\n') || '';
      console.log('✏️ Cargando campo para edición:', file.label || 'Sin etiqueta');
    } else {
      // Default empty FormsFiles for creating a new field
      const nextOrder = this.getNextFieldOrder();
      this.newFormFile = {
        id: undefined,
        label: '',
        field_code: '',
        type: 'text',
        required: false,
        options: [],
        validation_rules: [],
        field_order: nextOrder, // Set order to next available
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
            this.selectedFormFiles = this.sortFormFilesByOrder(files || []);
            console.log('📁 Archivos del formulario ordenados:', this.selectedFormFiles);
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
    this.isAddFieldMode = false; // Reset add field mode
    this.targetFormForNewField = null; // Clear target form reference
    // Clear edit form files when closing
    this.editFormFiles = [];
    this.currentEditingFileIndex = 0;
    
    // Clean up any pending form creation subscriptions
    this.cleanupFormCreationSubscriptions();
  }

  /**
   * Alternative method to handle form creation with field
   * This method uses a more robust approach by monitoring the store state
   */
  private handleFormCreationWithField() {
    const hasFieldData = this.newFormFile.label.trim() || this.newFormFile.field_code.trim();
    
    if (!hasFieldData) {
      console.log('📝 Solo se creó el formulario (sin campos)');
      return;
    }

    console.log('⏳ Configurando monitoreo para creación de formulario...');
    
    // Store current form count to detect when a new form is added
    let initialFormCount = 0;
    const initialCountSubscription = this.forms$.subscribe(forms => {
      initialFormCount = forms ? forms.length : 0;
      console.log('📊 Cantidad inicial de formularios:', initialFormCount);
      initialCountSubscription.unsubscribe();
    });

    // Monitor for new forms
    const newFormSubscription = this.forms$.subscribe(forms => {
      if (forms && forms.length > initialFormCount) {
        console.log('📊 Nueva cantidad de formularios:', forms.length);
        
        // Find the newest form (should have the highest ID or be the last in array)
        const newestForm = forms.reduce((newest, current) => {
          if (!newest) return current;
          if (!current.id || !newest.id) return current.id ? current : newest;
          return current.id > newest.id ? current : newest;
        });

        if (newestForm && newestForm.id) {
          console.log('✅ Formulario más reciente encontrado con ID:', newestForm.id);
          console.log('📝 Formulario:', newestForm.name);
          
          // Verify this is likely our form by checking name/code match
          if (newestForm.name === this.newForm.name && newestForm.code === this.newForm.code) {
            console.log('✅ Confirmado: Este es nuestro formulario recién creado');
            console.log('➕ Creando campo para el formulario...');
            
            // Create the field
            this.createFieldForForm(newestForm.id);
            
            // Update our form reference
            this.newForm.id = newestForm.id;
            
            // Clean up subscription
            newFormSubscription.unsubscribe();
          } else {
            console.log('⚠️ El formulario encontrado no coincide con el que estamos creando');
          }
        }
      }
    });

    // Add to subscription cleanup
    this.subscription.push(newFormSubscription);

    // Timeout to avoid infinite monitoring
    setTimeout(() => {
      if (!newFormSubscription.closed) {
        console.warn('⚠️ Timeout: No se detectó la creación del formulario');
        newFormSubscription.unsubscribe();
      }
    }, 15000); // 15 seconds timeout
  }

  /**
   * Create a field for a specific form
   */
  private createFieldForForm(formId: number) {
    console.log('🔧 Creando campo para formulario ID:', formId);
    
    const fieldData: Partial<FormsFiles> = {
      label: this.newFormFile.label,
      field_code: this.newFormFile.field_code,
      type: this.newFormFile.type,
      required: this.newFormFile.required,
      options: this.newFormFile.options,
      validation_rules: this.newFormFile.validation_rules,
      field_order: this.newFormFile.field_order,
      is_active: this.newFormFile.is_active
    };
    
    this.store.dispatch(FormFilesActions.uploadFormFile({ formId, fileData: fieldData }));
    console.log('🎉 Campo enviado para creación');
  }

  /**
   * Clean up subscriptions related to form creation
   */
  private cleanupFormCreationSubscriptions() {
    // Filter out any closed subscriptions and keep active ones
    this.subscription = this.subscription.filter(sub => {
      if (sub && !sub.closed) {
        return true; // Keep active subscriptions
      } else {
        return false; // Remove closed subscriptions
      }
    });
    console.log('🧹 Cleaned up form creation subscriptions');
  }

  // Navigation methods for editing multiple fields
  goToNextField() {
    if (this.currentEditingFileIndex < this.editFormFiles.length - 1) {
      this.currentEditingFileIndex++;
      this.loadFileForEditing(this.editFormFiles[this.currentEditingFileIndex]);
      console.log('➡️ Navegando al campo siguiente:', this.currentEditingFileIndex + 1);
    }
  }

  goToPreviousField() {
    if (this.currentEditingFileIndex > 0) {
      this.currentEditingFileIndex--;
      this.loadFileForEditing(this.editFormFiles[this.currentEditingFileIndex]);
      console.log('⬅️ Navegando al campo anterior:', this.currentEditingFileIndex + 1);
    }
  }

  /**
   * Navigate to a specific field by index
   */
  goToField(index: number) {
    if (index >= 0 && index < this.editFormFiles.length) {
      this.currentEditingFileIndex = index;
      this.loadFileForEditing(this.editFormFiles[index]);
      console.log('🎯 Navegando al campo:', index + 1);
    }
  }

  /**
   * Load specific field for editing
   */
  editSpecificField(field: FormsFiles, index: number) {
    this.currentEditingFileIndex = index;
    this.loadFileForEditing(field);
    console.log('✏️ Editando campo específico:', field.label);
  }

  addNewField() {
    this.currentEditingFileIndex = -1; // Indicates new field
    this.loadFileForEditing(null);
    console.log('➕ Preparando nuevo campo');
  }

  /**
   * Save the current field being edited
   */
  saveCurrentField() {
    if (!this.isCurrentFieldValid()) {
      this.alertService.toast('error', 'Por favor completa todos los campos requeridos');
      return;
    }

    // Process form data before saving
    this.processFormData();

    if (this.currentEditingFileIndex === -1) {
      // Creating a new field
      console.log('💾 Guardando nuevo campo:', this.newFormFile.label);
      
      const fieldData: Partial<FormsFiles> = {
        label: this.newFormFile.label,
        field_code: this.newFormFile.field_code,
        type: this.newFormFile.type,
        required: this.newFormFile.required,
        options: [...(this.newFormFile.options || [])],
        validation_rules: [...(this.newFormFile.validation_rules || [])],
        field_order: this.newFormFile.field_order,
        is_active: this.newFormFile.is_active
      };

      // Use selectedForm.id for advanced editor context
      const formId = this.selectedForm?.id || this.newForm.id;
      if (!formId) {
        this.alertService.toast('error', 'No se puede guardar: formulario no seleccionado');
        return;
      }

      this.store.dispatch(FormFilesActions.uploadFormFile({ 
        formId: formId, 
        fileData: fieldData 
      }));

      // Add to local array for immediate UI feedback
      const newField: FormsFiles = {
        ...fieldData,
        id: Date.now() // Temporary ID until real one comes from server
      } as FormsFiles;
      
      this.editFormFiles.push(newField);
      this.editFormFiles = this.sortFormFilesByOrder(this.editFormFiles);
      
      // Update current index to point to the new field
      this.currentEditingFileIndex = this.editFormFiles.findIndex(f => f.id === newField.id);
      
      this.alertService.toast('success', `Campo "${this.newFormFile.label}" creado exitosamente`);
    } else {
      // Updating existing field
      console.log('💾 Actualizando campo existente:', this.newFormFile.label);
      
      // Get the form ID
      const formId = this.selectedForm?.id || this.newForm.id;
      if (!formId) {
        this.alertService.toast('error', 'No se puede actualizar: formulario no seleccionado');
        return;
      }
      
      // Create a clean copy for the update
      const updatedFieldData: Partial<FormsFiles> = {
        label: this.newFormFile.label,
        field_code: this.newFormFile.field_code,
        type: this.newFormFile.type,
        required: this.newFormFile.required,
        options: [...(this.newFormFile.options || [])],
        validation_rules: [...(this.newFormFile.validation_rules || [])],
        field_order: this.newFormFile.field_order,
        is_active: this.newFormFile.is_active
      };
      
      this.store.dispatch(FormFilesActions.updateFormFile({ 
        formId: formId,
        fieldId: this.newFormFile.id!, 
        formFileData: updatedFieldData 
      }));

      // Update local array for immediate UI feedback
      this.editFormFiles[this.currentEditingFileIndex] = { ...updatedFieldData } as FormsFiles;
      this.editFormFiles = this.sortFormFilesByOrder([...this.editFormFiles]);
      
      // Find the updated field's new position after sorting
      this.currentEditingFileIndex = this.editFormFiles.findIndex(f => f.id === this.newFormFile.id);
      
      this.alertService.toast('success', `Campo "${this.newFormFile.label}" actualizado exitosamente`);
    }

    // Reload the form files to get fresh data from server
    const formId = this.selectedForm?.id || this.newForm.id;
    if (formId) {
      setTimeout(() => {
        this.store.dispatch(FormFilesActions.getFormFiles({ formId: formId }));
      }, 500);
    }
  }

  /**
   * Delete the current field being edited
   */
  deleteCurrentField() {
    if (this.newFormFile.id && this.currentEditingFileIndex >= 0) {
      this.alertService.confirm(
        '¿Estás seguro?', 
        `Esta acción eliminará permanentemente el campo "${this.newFormFile.label}"`
      ).then((result) => {
        if (result.isConfirmed) {
          console.log('🗑️ Eliminando campo:', this.newFormFile.label);
          
          // Get the form ID for deletion
          const deleteFormId = this.selectedForm?.id || this.newForm.id;
          if (!deleteFormId) {
            this.alertService.toast('error', 'No se puede eliminar: formulario no seleccionado');
            return;
          }
          
          this.store.dispatch(FormFilesActions.deleteFormFile({ 
            formId: deleteFormId,
            fieldId: this.newFormFile.id! 
          }));
          
          // Remove from local array
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
          
          this.alertService.toast('success', 'Campo eliminado exitosamente');
          
          // Reload the form files to get fresh data from server
          const reloadFormId = this.selectedForm?.id || this.newForm.id;
          if (reloadFormId) {
            setTimeout(() => {
              this.store.dispatch(FormFilesActions.getFormFiles({ formId: reloadFormId }));
            }, 500);
          }
        }
      });
    } else {
      this.alertService.toast('warning', 'No se puede eliminar un campo que no ha sido guardado');
    }
  }

  /**
   * Duplicate the current field
   */
  duplicateCurrentField() {
    if (this.currentEditingFileIndex >= 0) {
      const currentField = this.editFormFiles[this.currentEditingFileIndex];
      const nextOrder = this.getNextFieldOrder();
      
      // Create a copy with new properties
      const duplicatedField: Partial<FormsFiles> = {
        label: `${currentField.label} (Copia)`,
        field_code: `${currentField.field_code}_copy`,
        type: currentField.type,
        required: currentField.required,
        options: currentField.options ? [...currentField.options] : [],
        validation_rules: currentField.validation_rules ? { ...currentField.validation_rules } : [],
        field_order: nextOrder,
        is_active: currentField.is_active
      };

      console.log('📋 Duplicando campo:', currentField.label);
      
      this.store.dispatch(FormFilesActions.uploadFormFile({ 
        formId: this.newForm.id!, 
        fileData: duplicatedField 
      }));

      this.alertService.toast('success', `Campo "${currentField.label}" duplicado exitosamente`);
      
      // Reload the form files to get fresh data from server
      if (this.newForm.id) {
        setTimeout(() => {
          this.store.dispatch(FormFilesActions.getFormFiles({ formId: this.newForm.id! }));
        }, 500);
      }
    }
  }

  /**
   * Check if current field has valid data
   */
  isCurrentFieldValid(): boolean {
    return !!(
      this.newFormFile.label?.trim() &&
      this.newFormFile.field_code?.trim() &&
      this.newFormFile.type?.trim()
    );
  }

  /**
   * Reset current field to original state
   */
  resetCurrentField() {
    if (this.currentEditingFileIndex >= 0) {
      const originalField = this.editFormFiles[this.currentEditingFileIndex];
      this.loadFileForEditing(originalField);
      this.alertService.toast('info', 'Campo restaurado a su estado original');
    } else {
      this.loadFileForEditing(null);
      this.alertService.toast('info', 'Formulario de nuevo campo limpiado');
    }
  }

  /**
   * Move field up in order
   */
  moveFieldUp() {
    if (this.currentEditingFileIndex > 0) {
      const currentField = this.editFormFiles[this.currentEditingFileIndex];
      const previousField = this.editFormFiles[this.currentEditingFileIndex - 1];
      
      // Swap orders
      const tempOrder = currentField.field_order;
      currentField.field_order = previousField.field_order;
      previousField.field_order = tempOrder;
      
      // Get the form ID
      const formId = this.selectedForm?.id || this.newForm.id;
      if (!formId) {
        this.alertService.toast('error', 'No se puede actualizar: formulario no seleccionado');
        return;
      }
      
      // Update both fields
      this.store.dispatch(FormFilesActions.updateFormFile({ 
        formId: formId,
        fieldId: currentField.id!, 
        formFileData: currentField 
      }));
      
      this.store.dispatch(FormFilesActions.updateFormFile({ 
        formId: formId,
        fieldId: previousField.id!, 
        formFileData: previousField 
      }));
      
      // Update local array and current index
      this.editFormFiles = this.sortFormFilesByOrder([...this.editFormFiles]);
      this.currentEditingFileIndex = this.editFormFiles.findIndex(f => f.id === currentField.id);
      
      this.alertService.toast('success', 'Campo movido hacia arriba');
    }
  }

  /**
   * Move field down in order
   */
  moveFieldDown() {
    if (this.currentEditingFileIndex < this.editFormFiles.length - 1) {
      const currentField = this.editFormFiles[this.currentEditingFileIndex];
      const nextField = this.editFormFiles[this.currentEditingFileIndex + 1];
      
      // Swap orders
      const tempOrder = currentField.field_order;
      currentField.field_order = nextField.field_order;
      nextField.field_order = tempOrder;
      
      // Get the form ID
      const formId = this.selectedForm?.id || this.newForm.id;
      if (!formId) {
        this.alertService.toast('error', 'No se puede actualizar: formulario no seleccionado');
        return;
      }
      
      // Update both fields
      this.store.dispatch(FormFilesActions.updateFormFile({ 
        formId: formId,
        fieldId: currentField.id!, 
        formFileData: currentField 
      }));
      
      this.store.dispatch(FormFilesActions.updateFormFile({ 
        formId: formId,
        fieldId: nextField.id!, 
        formFileData: nextField 
      }));
      
      // Update local array and current index
      this.editFormFiles = this.sortFormFilesByOrder([...this.editFormFiles]);
      this.currentEditingFileIndex = this.editFormFiles.findIndex(f => f.id === currentField.id);
      
      this.alertService.toast('success', 'Campo movido hacia abajo');
    }
  }

  handleAddField() {
    if (!this.selectedForm || !this.selectedForm.id) {
      console.error('❌ Error: No hay formulario seleccionado para agregar campo');
      this.alertService.toast('error', 'No se puede agregar campo: formulario no válido');
      return;
    }

    console.log('➕ Preparando modal para agregar campo al formulario:', this.selectedForm.name);
    console.log('🔧 Formulario ID:', this.selectedForm.id);
    
    // Keep reference to the target form for adding fields
    this.targetFormForNewField = { ...this.selectedForm };
    
    // Close details modal
    this.closeDetailsModal();
    
    // Set up for "add field" mode
    this.isEditMode = false; // Not editing form itself
    this.isAddFieldMode = true; // Specifically adding a field
    this.newForm = { ...this.selectedForm };
    
    // Clear previous form files and set up for new field creation
    this.clearFormFilesStorage();
    this.editFormFiles = this.sortFormFilesByOrder([...this.selectedFormFiles]); // Copy and sort current fields
    this.currentEditingFileIndex = -1; // Indicates new field
    
    // Initialize new field with proper order
    const nextOrder = this.selectedFormFiles && this.selectedFormFiles.length > 0 
      ? Math.max(...this.selectedFormFiles.map(field => field.field_order ?? 0)) + 1 
      : 0;
      
    this.newFormFile = {
      id: undefined,
      label: '',
      field_code: '',
      type: 'text', // Default type
      required: false,
      options: [],
      validation_rules: [],
      field_order: nextOrder, // Next available order
      is_active: true
    };
    
    // Reset auxiliary properties
    this.optionsText = '';
    this.validationRulesText = '';
    
    // Show form modal in "add field" mode
    this.showFormModal = true;
    
    console.log('✅ Modal configurado para agregar campo');
    console.log('📋 Orden del nuevo campo:', this.newFormFile.field_order);
    console.log('🎯 Modo: isAddFieldMode =', this.isAddFieldMode);
  }

  /**
   * Handle submission specifically for adding a new field to existing form
   */
  onSubmitNewField() {
    if (!this.targetFormForNewField || !this.targetFormForNewField.id) {
      console.error('❌ Error: No hay formulario válido para agregar campo');
      this.alertService.toast('error', 'Error: Formulario no válido');
      return;
    }

    // Validate field data
    if (!this.newFormFile.label.trim()) {
      this.alertService.toast('error', 'El nombre del campo es requerido');
      return;
    }

    if (!this.newFormFile.field_code.trim()) {
      this.alertService.toast('error', 'El código del campo es requerido');
      return;
    }

    if (!this.newFormFile.type.trim()) {
      this.alertService.toast('error', 'El tipo de campo es requerido');
      return;
    }

    console.log('📝 Creando nuevo campo para formulario ID:', this.targetFormForNewField.id);
    console.log('🔧 Datos del campo:', {
      label: this.newFormFile.label,
      code: this.newFormFile.field_code,
      type: this.newFormFile.type,
      order: this.newFormFile.field_order
    });

    // Process auxiliary properties
    this.processFormData();

    // Create JSON object for the new field
    const fieldData: Partial<FormsFiles> = {
      label: this.newFormFile.label,
      field_code: this.newFormFile.field_code,
      type: this.newFormFile.type,
      required: this.newFormFile.required,
      options: this.newFormFile.options,
      validation_rules: this.newFormFile.validation_rules,
      field_order: this.newFormFile.field_order,
      is_active: this.newFormFile.is_active
    };

    console.log('📤 Enviando datos del campo:', fieldData);

    // Dispatch action to create the field
    this.store.dispatch(FormFilesActions.uploadFormFile({ 
      formId: this.targetFormForNewField.id!, 
      fileData: fieldData 
    }));

    // Show success message
    this.alertService.toast('success', `Campo "${this.newFormFile.label}" agregado al formulario`);

    // Close modal and refresh form details
    this.closeFormModal();
    
    // Optionally reopen the details modal to show the updated form
    setTimeout(() => {
      this.viewFormDetails(this.targetFormForNewField!.id!);
    }, 500);
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
    // Check if we're adding a field to an existing form
    if (this.isAddFieldMode) {
      console.log('🔧 Detectado: Agregando campo a formulario existente');
      this.onSubmitNewField();
      return;
    }

    // Process auxiliary properties before submitting
    this.processFormData();
    
    if (this.isEditMode) {
      // Update the form
      this.store.dispatch(FormActions.putForm({ id: this.newForm.id!, formData: this.newForm }));
      
      // Handle form file update/creation
      if (this.currentEditingFileIndex === -1) {
        // Creating a new field
        console.log('➕ Creando nuevo campo:', this.newFormFile.label);
        
        // Convert FormsFiles to JSON object for new field
        const fieldData: Partial<FormsFiles> = {
          label: this.newFormFile.label,
          field_code: this.newFormFile.field_code,
          type: this.newFormFile.type,
          required: this.newFormFile.required,
          options: this.newFormFile.options,
          validation_rules: this.newFormFile.validation_rules,
          field_order: this.newFormFile.field_order,
          is_active: this.newFormFile.is_active
        };

        this.store.dispatch(FormFilesActions.uploadFormFile({ formId: this.newForm.id!, fileData: fieldData }));
      } else {
        // Updating existing field
        console.log('✏️ Actualizando campo:', this.newFormFile.label);
        
        // Get the form ID
        const formId = this.selectedForm?.id || this.newForm.id;
        if (!formId || !this.newFormFile.id) {
          this.alertService.toast('error', 'No se puede actualizar: formulario o campo no válido');
          return;
        }
        
        this.store.dispatch(FormFilesActions.updateFormFile({ 
          formId: formId,
          fieldId: this.newFormFile.id, 
          formFileData: this.newFormFile 
        }));
      }
    } else {
      // Creating new form
      console.log('📝 Creando nuevo formulario:', this.newForm.name);
      
      // Set up monitoring for form creation with field
      this.handleFormCreationWithField();
      
      // Create the form
      this.store.dispatch(FormActions.postForm({ formData: this.newForm }));
    }
    
    this.closeFormModal();
  }

  private processFormData() {
    // Create a mutable copy of the form file to avoid read-only property errors
    const updatedFormFile = { ...this.newFormFile };
    
    // Convert options text to array (handle both line-separated and comma-separated)
    if (this.optionsText.trim()) {
      // First try to split by lines, then by commas if no lines found
      let options = this.optionsText.split('\n')
        .map(option => option.trim())
        .filter(option => option.length > 0);
      
      // If only one option and it contains commas, split by commas
      if (options.length === 1 && options[0].includes(',')) {
        options = options[0].split(',')
          .map(option => option.trim())
          .filter(option => option.length > 0);
      }
      
      updatedFormFile.options = [...options];
    } else {
      updatedFormFile.options = [];
    }

    // Convert validation rules text to array (based on the model definition)
    if (this.validationRulesText.trim()) {
      // Split by lines and filter empty lines
      updatedFormFile.validation_rules = [
        ...this.validationRulesText.split('\n')
          .map(rule => rule.trim())
          .filter(rule => rule.length > 0)
      ];
    } else {
      updatedFormFile.validation_rules = [];
    }

    // Ensure field_order is a number
    if (typeof updatedFormFile.field_order === 'string') {
      updatedFormFile.field_order = parseInt(updatedFormFile.field_order as string, 10) || 0;
    }

    // Update the form file with the processed data
    this.newFormFile = updatedFormFile;

    console.log('📋 Datos procesados del campo:', {
      label: this.newFormFile.label,
      field_code: this.newFormFile.field_code,
      type: this.newFormFile.type,
      options: this.newFormFile.options,
      validation_rules: this.newFormFile.validation_rules,
      field_order: this.newFormFile.field_order
    });
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
   * Sort form files by field_order
   */
  private sortFormFilesByOrder(files: FormsFiles[]): FormsFiles[] {
    if (!files || files.length === 0) return files;
    
    // Create a shallow copy of the array to avoid modifying the original read-only array
    return [...files].sort((a, b) => {
      const orderA = a.field_order ?? 0;
      const orderB = b.field_order ?? 0;
      return orderA - orderB;
    });
  }

  /**
   * Get the next available field order
   */
  private getNextFieldOrder(): number {
    if (!this.editFormFiles || this.editFormFiles.length === 0) {
      return 0;
    }
    
    // Find the highest field_order and add 1
    const maxOrder = Math.max(...this.editFormFiles.map(field => field.field_order ?? 0));
    return maxOrder + 1;
  }

  /**
   * Open advanced field editor
   */
  openAdvancedFieldEditor() {
    if (!this.selectedForm || !this.selectedForm.id) {
      this.alertService.toast('error', 'No hay formulario seleccionado');
      return;
    }

    console.log('🚀 Abriendo editor avanzado para formulario:', this.selectedForm.name);
    console.log('🔍 Estado antes de abrir:', {
      selectedForm: this.selectedForm,
      showAdvancedFieldEditor: this.showAdvancedFieldEditor
    });
    
    // Load form files for editing
    this.store.dispatch(FormFilesActions.getFormFiles({ formId: this.selectedForm.id }));
    
    // Set the flag immediately
    this.showAdvancedFieldEditor = true;
    console.log('✅ showAdvancedFieldEditor establecido en:', this.showAdvancedFieldEditor);
    
    // Wait for files to load
    setTimeout(() => {
      const advancedEditorSubscription = this.formFiles$.subscribe(files => {
        this.editFormFiles = this.sortFormFilesByOrder(files || []);
        console.log('📋 Campos cargados en editor avanzado:', this.editFormFiles);
        
        // Load first field if available
        if (this.editFormFiles.length > 0) {
          this.editSpecificField(this.editFormFiles[0], 0);
        } else {
          this.addNewField();
        }
      });
      this.subscription.push(advancedEditorSubscription);
    }, 200);

    // Close details modal
    this.closeDetailsModal();
  }

  /**
   * Close advanced field editor
   */
  closeAdvancedFieldEditor() {
    this.showAdvancedFieldEditor = false;
    this.editFormFiles = [];
    this.currentEditingFileIndex = 0;
    console.log('❌ Editor avanzado cerrado');
  }

  /**
   * Save all fields and close editor
   */
  saveAllFieldsAndClose() {
    // Save current field if it's being edited
    if (this.isCurrentFieldValid()) {
      this.saveCurrentField();
    }

    this.alertService.toast('success', 'Todos los campos han sido guardados');
    
    // Refresh the form details
    setTimeout(() => {
      if (this.selectedForm?.id) {
        this.viewFormDetails(this.selectedForm.id);
      }
      this.closeAdvancedFieldEditor();
    }, 1000);
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
    this.subscription.forEach((sub, index) => {
      if (sub && !sub.closed) {
        console.log(`🧹 Unsubscribing from subscription ${index}`);
        sub.unsubscribe();
      }
    });
    this.subscription = [];
    
    // Clear form files storage when component is destroyed
    this.clearFormFilesStorage();
    
    console.log('🧹 FormsManagerComponent destroyed and cleaned up');
  }
}
