import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModuleRoutingModule } from './forms-module-routing.module';
import { FormsComponent } from './forms/forms.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    FormsModuleRoutingModule,
    FormsComponent
  ]
})
export class FormsModuleModule { }
