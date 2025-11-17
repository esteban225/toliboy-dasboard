import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryModuleRoutingModule } from './inventory-module-routing.module';
import { InventoryComponent } from './inventory/inventory.component';
import { RawMaterialsComponent } from './pages/raw-materials/raw-materials.component';
import { InventoryMovementComponent } from './pages/inventory-movement/inventory-movement.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    InventoryModuleRoutingModule,
    InventoryComponent,
    InventoryMovementComponent,
    RawMaterialsComponent
  ]
})
export class InventoryModuleModule { }
