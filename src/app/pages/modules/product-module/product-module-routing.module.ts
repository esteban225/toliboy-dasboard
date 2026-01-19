import {NgModule} from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { ProductsListComponent } from './pages/products-list/products-list.component';
import { ProductsAnalyticsComponent } from './pages/products-analytics/products-analytics.component';
const routes: Routes = [
  {
    path: '',
    component: ProductsListComponent
  },
  { 
    path: 'analytics',
    component: ProductsAnalyticsComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProductModuleRoutingModule { }