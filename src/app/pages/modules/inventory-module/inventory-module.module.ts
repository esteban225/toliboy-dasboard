import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryModuleRoutingModule } from './inventory-module-routing.module';
import { InventoryComponent } from './inventory/inventory.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    InventoryModuleRoutingModule,
    InventoryComponent
  ]
})
export class InventoryModuleModule { }
