import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';

import { KanbanboardRoutingModule } from './kanbanboard-routing.module';
import { KanbanboardComponent } from './kanbanboard.component';
import { DynamicFormComponent } from './components/dynamic-form/dynamic-form.component';
import { formResponseReducer } from './store/reducers/formResponse.reducers';
import { FormResponseEffects } from './store/effects/formResponse.effects';

@NgModule({
  declarations: [
    KanbanboardComponent,
    DynamicFormComponent
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    KanbanboardRoutingModule,
    StoreModule.forFeature('formResponse', formResponseReducer),
    EffectsModule.forFeature([FormResponseEffects])
  ]
})
export class KanbanboardModule { }