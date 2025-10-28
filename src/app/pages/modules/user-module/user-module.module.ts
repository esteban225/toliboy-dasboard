import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { UserModuleRoutingModule } from './user-module-routing.module';
import { UserListComponent } from './components/user-list/user-list.component';


@NgModule({
  imports: [
    CommonModule,
    RouterModule,
    UserModuleRoutingModule,
    UserListComponent,

  ]
})
export class UserModuleModule { }
