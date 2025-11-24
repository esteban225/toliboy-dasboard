import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { FormsComponent } from './forms/forms.component';
import { FormsManagerComponent } from './pages/forms-manager/forms-manager.component';
import { FormsResponsesComponent } from './pages/forms-responses/forms-responses.component';
import { FormsTrazabilityComponent } from './pages/forms-trazability/forms-trazability.component';

const routes: Routes = [
  {
    path: '',
    component: FormsComponent
  }, {
    path: 'forms-manager',
    component: FormsManagerComponent
  },
  {
    path: 'forms-responses',
    component: FormsResponsesComponent
  },
  {
    path: 'forms-trazability',
    component: FormsTrazabilityComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class FormsModuleRoutingModule { }
