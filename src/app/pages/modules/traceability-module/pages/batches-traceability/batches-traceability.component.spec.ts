import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchesTraceabilityComponent } from './batches-traceability.component';

describe('BatchesTraceabilityComponent', () => {
  let component: BatchesTraceabilityComponent;
  let fixture: ComponentFixture<BatchesTraceabilityComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchesTraceabilityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchesTraceabilityComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
