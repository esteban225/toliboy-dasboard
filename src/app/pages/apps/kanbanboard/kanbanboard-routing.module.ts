import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { KanbanboardComponent } from './kanbanboard.component';

const routes: Routes = [
  {
    path: '',
    component: KanbanboardComponent
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class KanbanboardRoutingModule { }