import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FormFilesComponent } from './form-files.component';

describe('FormFilesComponent', () => {
  let component: FormFilesComponent;
  let fixture: ComponentFixture<FormFilesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FormFilesComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(FormFilesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
