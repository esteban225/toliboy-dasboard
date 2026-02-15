import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// Componentes
import { UserListComponent } from './components/user-list/user-list.component';
import { UserWorklogComponent } from './components/user-worklog/user-worklog.component';
import { UserAnalyticsComponent } from './components/user-analytics/user-analytics.component';

const routes: Routes = [
  {
    path: '',
    children: [
      {
        // Lista de usuarios con acciones CRUD de usuarios y contactos
        path: '',
        component: UserListComponent
      },
      {
        // Ruta para la gestión de usuarios de Worklog
        path: 'worklog-users',
        component: UserWorklogComponent
      },
      {
        // Ruta para analíticas de usuarios y horas de trabajo
        path: 'analytics',
        component: UserAnalyticsComponent
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserModuleRoutingModule { }
