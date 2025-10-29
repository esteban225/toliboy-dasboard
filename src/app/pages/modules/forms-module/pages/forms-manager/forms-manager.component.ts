import { Component, OnDestroy, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { Observable, Subscription } from 'rxjs';
import { Forms } from '../../model/forms.model';
import { Store } from '@ngrx/store';
import { Actions } from '@ngrx/store-devtools/src/reducer';
import { AlertService } from 'src/app/core/services/alert.service';

import * as FormSelectors from '../../store/selectors/forms.selectors';
import * as FormActions from '../../store/actions/forms.actions';

@Component({
  selector: 'app-forms-manager',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './forms-manager.component.html',
  styleUrls: ['./forms-manager.component.scss']
})
export class FormsManagerComponent implements OnInit, OnDestroy {

  forms$: Observable<Forms[]>;
  loading$: Observable<boolean>;
  error$: Observable<string | null>;

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


  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.forms$ = this.store.select(FormSelectors.selectAllForms);
    this.loading$ = this.store.select(FormSelectors.selectFormsLoading);
    this.error$ = this.store.select(FormSelectors.selectFormsError);
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

    // Debug subscriptions
    this.forms$.subscribe(forms => {
      console.log('📝 Forms data received:', forms);
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
    this.showFormModal = true;
  }

  openEditModal(form: Forms) {
    this.isEditMode = true;
    this.newForm = { ...form };
    this.showFormModal = true;
  }

  closeFormModal() {
    this.showFormModal = false;
  }

  onSubmit() {
    if (this.isEditMode) {
      this.store.dispatch(FormActions.putForm({ id: this.newForm.id!, formData: this.newForm }));
    } else {
      this.store.dispatch(FormActions.postForm({ formData: this.newForm }));
    }
    this.closeFormModal();
  }

  deleteForm(id: number): void {
    if (!id) return;
    this.alertService.confirm('¿Estás seguro?', 'Esta acción no se puede deshacer')
      .then((result) => {
        if (result.isConfirmed) {
          this.store.dispatch(FormActions.deleteForm({ id }));
          this.alertService.toast('success', 'Formulario eliminado');
        } else {
          this.alertService.toast('info', 'Eliminación cancelada');
        }
      });
  }

  ngOnDestroy(): void {
  }
}
