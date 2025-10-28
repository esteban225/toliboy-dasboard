import { Component, OnDestroy, OnInit } from '@angular/core';
import {
  trigger,
  style,
  transition,
  animate,
} from '@angular/animations';
import { Observable, Subscription } from 'rxjs';
import { Store } from '@ngrx/store';
import * as FormResponseActions from './store/actions/formResponse.actions';
import * as FormResponseSelectors from './store/selectors/formResponse.selectors';
import { AlertService } from 'src/app/core/services/alert.service';

@Component({
  selector: 'app-kanbanboard',
  templateUrl: './kanbanboard.component.html',
  styleUrls: ['./kanbanboard.component.scss'],
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
export class KanbanboardComponent implements OnInit, OnDestroy {

  formResponse$: Observable<any>;
  private subscriptions: Subscription[] = [];
  formValidatorRules$: Observable<any>;

  // UI state variables
  showProduccion = false;
  showMateria = false;
  modalVisible = false;
  modalTitle = '';

  // Toggle the visibility of the specified section
  toggleSection(section: 'materia' | 'produccion') {
    this.showMateria = section === 'materia' ? !this.showMateria : false;
    this.showProduccion = section === 'produccion' ? !this.showProduccion : false;
  }

  // Open the modal with the specified title
  openModal(title: string) {
    this.modalTitle = title;
    this.modalVisible = true;
  }

  // Close the modal
  closeModal() {
    this.modalVisible = false;
  }




  constructor(
    private store: Store,
    private alertService: AlertService
  ) {
    this.formResponse$ = this.store.select(FormResponseSelectors.selectFormResponse);
    this.formValidatorRules$ = this.store.select(FormResponseSelectors.selectFormValidatorRules);
  }


  ngOnInit(): void {
    this.store.dispatch(FormResponseActions.fetchAllForms());
  }

  onSubmit(): void {
    // Handle form submission
  }

  ngOnDestroy(): void {
    // Cleanup logic here

  }
}
