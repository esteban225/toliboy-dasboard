import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsTrazabilityComponent } from './forms-trazability.component';

describe('FormsTrazabilityComponent', () => {
  let component: FormsTrazabilityComponent;
  let fixture: ComponentFixture<FormsTrazabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsTrazabilityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormsTrazabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
