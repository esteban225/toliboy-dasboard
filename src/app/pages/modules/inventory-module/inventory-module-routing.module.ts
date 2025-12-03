import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { InventoryComponent } from './inventory/inventory.component';
import { InventoryMovementComponent } from './pages/inventory-movement/inventory-movement.component';
import { RawMaterialsComponent } from './pages/raw-materials/raw-materials.component';
import { InventoryExpenseReportComponent } from './pages/inventory-expense-report/inventory-expense-report.component';

const routes: Routes = [
  {
    path: '',
    component: InventoryComponent
  },
  {
    path: 'inventoryMovement',
    component: InventoryMovementComponent
  },
  {
    path:'rawMaterial',
    component:RawMaterialsComponent
  },
  {
    path: 'inventoryExpenseReport',
    component: InventoryExpenseReportComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class InventoryModuleRoutingModule { }
