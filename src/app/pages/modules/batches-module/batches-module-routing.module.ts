import { NgModule } from "@angular/core";
import { RouterModule, Routes } from "@angular/router";
import {BatchesListComponent} from './pages/batches-list/batches-list.component';
import{BatchesAnalyticsComponent} from './pages/batches-analytics/batches-analytics.component';

const routes: Routes = [
  { 
     path: '',
        component: BatchesListComponent
    },
    {
        path: 'analytics',  
        component: BatchesAnalyticsComponent
    },
    {
        path: 'batch-tracking',  
        component: BatchesAnalyticsComponent
    }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class BatchesModuleRoutingModule { }