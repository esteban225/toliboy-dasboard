import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormsResponsesComponent } from './forms-responses.component';

describe('FormsResponsesComponent', () => {
  let component: FormsResponsesComponent;
  let fixture: ComponentFixture<FormsResponsesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormsResponsesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormsResponsesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
