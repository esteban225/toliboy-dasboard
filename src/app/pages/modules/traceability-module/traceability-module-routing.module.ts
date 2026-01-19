import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { DashboardTraceabilityComponent } from './pages/dashboard-traceability/dashboard-traceability.component';

const routes: Routes = [
    {
        path: '',
        component: DashboardTraceabilityComponent
    }
]

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class TraceabilityModuleRoutingModule { }