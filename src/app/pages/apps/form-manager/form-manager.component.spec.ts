import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormManagerComponent } from './form-manager.component';

describe('FormManagerComponent', () => {
  let component: FormManagerComponent;
  let fixture: ComponentFixture<FormManagerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormManagerComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormManagerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
