import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../core/guards/role.guard';

const routes: Routes = [
  {
    path: '', 
    loadChildren: () => import('./dashboards/dashboards.module').then(m => m.DashboardsModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'apps', 
    loadChildren: () => import('./apps/apps.module').then(m => m.AppsModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'ui', 
    loadChildren: () => import('./ui/ui.module').then(m => m.UiModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'invoices', 
    loadChildren: () => import('./invoices/invoices.module').then(m => m.InvoicesModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'advance-ui', 
    loadChildren: () => import('./advance-ui/advance-ui.module').then(m => m.AdvanceUiModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'maps', 
    loadChildren: () => import('./maps/maps.module').then(m => m.MapsModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'icons', 
    loadChildren: () => import('./icons/icons.module').then(m => m.IconsModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'charts', 
    loadChildren: () => import('./charts/charts.module').then(m => m.ChartsModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'tables', 
    loadChildren: () => import('./tables/tables.module').then(m => m.TablesModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'forms', 
    loadChildren: () => import('./forms/forms.module').then(m => m.FormModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'pages', 
    loadChildren: () => import('./extrapages/extrapages.module').then(m => m.ExtrapagesModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'admin', 
    loadChildren: () => import('./admin/admin.module').then(m => m.AdminModule),
    canActivate: [RoleGuard]
  },
  {
    path: 'modules/users',
    loadChildren: () => import('./modules/user-module/user-module.module').then(m => m.UserModuleModule),
    canActivate: [RoleGuard]
  },
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class PagesRoutingModule { }
