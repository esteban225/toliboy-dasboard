import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UserWorklogComponent } from './user-worklog.component';

describe('UserWorklogComponent', () => {
  let component: UserWorklogComponent;
  let fixture: ComponentFixture<UserWorklogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UserWorklogComponent]
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
