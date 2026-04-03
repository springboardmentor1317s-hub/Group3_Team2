import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ScanCheckInComponent } from './scan-check-in.component';

describe('ScanCheckInComponent', () => {
  let component: ScanCheckInComponent;
  let fixture: ComponentFixture<ScanCheckInComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ScanCheckInComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ScanCheckInComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
