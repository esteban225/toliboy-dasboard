import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchMovementComponent } from './batch-movement.component';

describe('BatchMovementComponent', () => {
  let component: BatchMovementComponent;
  let fixture: ComponentFixture<BatchMovementComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchMovementComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchMovementComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
