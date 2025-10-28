import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { RoleGuard } from '../../core/guards/role.guard';

// Components
import { UsersComponent } from './users/users.component';
import { SettingsComponent } from './settings/settings.component';

const routes: Routes = [
  {
    path: 'users',
    component: UsersComponent,
    canActivate: [RoleGuard]
  },
  {
    path: 'settings',
    component: SettingsComponent,
    canActivate: [RoleGuard]
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class AdminRoutingModule { }