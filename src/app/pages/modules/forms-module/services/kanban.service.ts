import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class KanbanService {
  private formVisibility = new BehaviorSubject<boolean>(false);
  isFormVisible$ = this.formVisibility.asObservable();

  showForm() {
    this.formVisibility.next(true);
  }

  hideForm() {
    this.formVisibility.next(false);
  }
}
