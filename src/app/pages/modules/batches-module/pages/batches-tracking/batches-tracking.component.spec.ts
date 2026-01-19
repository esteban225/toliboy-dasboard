import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchesTrackingComponent } from './batches-tracking.component';

describe('BatchesTrackingComponent', () => {
  let component: BatchesTrackingComponent;
  let fixture: ComponentFixture<BatchesTrackingComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchesTrackingComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchesTrackingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
