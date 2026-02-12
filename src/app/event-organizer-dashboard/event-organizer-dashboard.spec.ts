import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EventOrganizerDashboard } from './event-organizer-dashboard';

describe('EventOrganizerDashboard', () => {
  let component: EventOrganizerDashboard;
  let fixture: ComponentFixture<EventOrganizerDashboard>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventOrganizerDashboard]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EventOrganizerDashboard);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
