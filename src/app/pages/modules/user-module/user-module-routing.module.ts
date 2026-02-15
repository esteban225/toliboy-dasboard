import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
// Componentes
import { UserListComponent } from './components/user-list/user-list.component';
import { UserWorklogComponent } from './components/user-worklog/user-worklog.component';

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
      }
    ]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class UserModuleRoutingModule { }
