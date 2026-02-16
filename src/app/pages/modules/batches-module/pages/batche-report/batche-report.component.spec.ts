import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BatcheReportComponent } from './batche-report.component';

describe('BatcheReportComponent', () => {
  let component: BatcheReportComponent;
  let fixture: ComponentFixture<BatcheReportComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BatcheReportComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(BatcheReportComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
