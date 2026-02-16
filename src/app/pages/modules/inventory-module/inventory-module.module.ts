import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { InventoryModuleRoutingModule } from './inventory-module-routing.module';
import { InventoryComponent } from './inventory/inventory.component';
import { RawMaterialsComponent } from './pages/raw-materials/raw-materials.component';
import { InventoryMovementComponent } from './pages/inventory-movement/inventory-movement.component';
import { InventoryExpenseReportComponent } from './pages/inventory-expense-report/inventory-expense-report.component';
import { BatchMovementComponent } from './pages/batch-movement/batch-movement.component';

@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    InventoryModuleRoutingModule,
    InventoryComponent,
    InventoryMovementComponent,
    RawMaterialsComponent,
    InventoryExpenseReportComponent,
    BatchMovementComponent
  ]
})
export class InventoryModuleModule { }
