import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BatchesModuleRoutingModule } from './batches-module-routing.module';
import { BatchesListComponent } from './pages/batches-list/batches-list.component';
import { BatchesAnalyticsComponent } from './pages/batches-analytics/batches-analytics.component';
import { BatchesTrackingComponent } from './pages/batches-tracking/batches-tracking.component';



@NgModule({
  declarations: [],
  imports: [
    CommonModule,
    BatchesModuleRoutingModule,
    BatchesListComponent,
    BatchesAnalyticsComponent,
    BatchesTrackingComponent

  ]
})
export class BatchesModuleModule { }
