import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModuleRoutingModule } from './forms-module-routing.module';
import { FormsComponent } from './forms/forms.component';

import { DynamicFormComponent } from './components/dynamic-form/dynamic-form.component';
import { formResponseReducer } from './store/reducers/formResponse.reducers';
import { FormResponseEffects } from './store/effects/formResponse.effects';

@NgModule({
  declarations: [
    FormsComponent,
    DynamicFormComponent

  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModuleRoutingModule,
    StoreModule.forFeature('formResponse', formResponseReducer),
    EffectsModule.forFeature([FormResponseEffects])
  ]
})
export class FormsModuleModule { }
