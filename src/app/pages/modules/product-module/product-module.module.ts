import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ProductModuleRoutingModule } from './product-module-routing.module';
import { ProductsListComponent } from './pages/products-list/products-list.component';
import { ProductsAnalyticsComponent } from './pages/products-analytics/products-analytics.component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    ProductModuleRoutingModule,
    ProductsListComponent,
    ProductsAnalyticsComponent
  ]
})
export class ProductModuleModule { }
