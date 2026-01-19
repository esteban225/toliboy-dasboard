import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatchesAnalyticsComponent } from './batches-analytics.component';

describe('BatchesAnalyticsComponent', () => {
  let component: BatchesAnalyticsComponent;
  let fixture: ComponentFixture<BatchesAnalyticsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatchesAnalyticsComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatchesAnalyticsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
