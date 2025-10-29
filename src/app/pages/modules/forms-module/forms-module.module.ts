import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { StoreModule } from '@ngrx/store';
import { EffectsModule } from '@ngrx/effects';
import { FormsModuleRoutingModule } from './forms-module-routing.module';

// Store
import { formResponseReducer } from './store/reducers/formResponse.reducers';
import { FormResponseEffects } from './store/effects/formResponse.effects';
import { formReducer } from './store/reducers/forms.reducers';
import { FormsEffects } from './store/effects/forms.effects';

// Components
import { FormsComponent } from './forms/forms.component';
import { DynamicFormComponent } from './components/dynamic-form/dynamic-form.component';
import { FormsManagerComponent } from "./pages/forms-manager/forms-manager.component";
import { FormsResponsesComponent } from "./pages/forms-responses/forms-responses.component";
import { FormsTrazabilityComponent } from "./pages/forms-trazability/forms-trazability.component";



@NgModule({
  declarations: [
    FormsComponent,
    DynamicFormComponent,
  ],
  imports: [
    CommonModule,
    ReactiveFormsModule,
    FormsModuleRoutingModule,
    StoreModule.forFeature('formResponse', formResponseReducer),
    StoreModule.forFeature('forms', formReducer),
    EffectsModule.forFeature([FormResponseEffects, FormsEffects]),
    FormsManagerComponent,
    FormsResponsesComponent,
    FormsTrazabilityComponent,
  ]
})
export class FormsModuleModule { }
