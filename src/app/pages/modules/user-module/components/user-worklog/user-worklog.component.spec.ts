import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { UserWorklogComponent } from './user-worklog.component';
import { WorklogService } from '../../services/worklog.service';
import { UserService } from '../../services/user.service';
import { AlertService } from 'src/app/core/services/alert.service';

class WorklogServiceStub {
  getWorklogsByUser() {
    return of([]);
  }
  getWorklogs() {
    return of({ data: [] });
  }
  updateWorklog() {
    return of({});
  }
  createWorklog() {
    return of({});
  }
  deleteWorklog() {
    return of(void 0);
  }
  registerWorklog() {
    return of({});
  }
}

class UserServiceStub {
  getUsers() {
    return of([]);
  }
}

class AlertServiceStub {
  success() {}
  error() {}
  confirm() {
    return Promise.resolve({ isConfirmed: false });
  }
}

describe('UserWorklogComponent', () => {
  let component: UserWorklogComponent;
  let fixture: ComponentFixture<UserWorklogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserWorklogComponent],
      providers: [
        { provide: WorklogService, useClass: WorklogServiceStub },
        { provide: UserService, useClass: UserServiceStub },
        { provide: AlertService, useClass: AlertServiceStub }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(UserWorklogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
