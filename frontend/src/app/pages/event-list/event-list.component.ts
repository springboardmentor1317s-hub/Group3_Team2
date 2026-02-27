import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, Event } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div style="padding: 20px;">
      <!-- Header -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px;">
        <h1 style="margin: 0; color: #333;">Events</h1>
        <div>
          <span style="background: #3498db; color: white; padding: 5px 10px; border-radius: 20px; margin-right: 15px;">
            {{ events.length }} Total
          </span>
          <button *ngIf="authService.getRole() === 'college-admin'" 
                  style="background: #2ecc71; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"
                  (click)="goToCreateEvent()">
            + Create Event
          </button>
        </div>
      </div>

      <!-- Simple Event List -->
      <div *ngIf="events.length === 0" style="text-align: center; padding: 50px; background: #f5f5f5; border-radius: 8px;">
        <p style="color: #999; margin-bottom: 20px;">No events found</p>
        <button *ngIf="authService.getRole() === 'college-admin'"
                style="background: #3498db; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;"
                (click)="createTestEvent()">
          Create Test Event
        </button>
      </div>

      <!-- Event Cards -->
      <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px;">
        <div *ngFor="let event of events" 
             style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Event Type Header -->
          <div [style.background]="getTypeColor(event.type)" style="padding: 8px 15px; color: white; font-weight: 600;">
            {{ event.type | uppercase }}
          </div>
          
          <!-- Event Content -->
          <div style="padding: 15px;">
            <h3 style="margin: 0 0 10px; color: #333;">{{ event.title }}</h3>
            <p style="color: #666; font-size: 14px; margin-bottom: 15px;">{{ event.description }}</p>
            
            <div style="font-size: 13px;">
              <p style="margin: 5px 0;"><strong>📍 Venue:</strong> {{ event.venue }}</p>
              <p style="margin: 5px 0;"><strong>📅 Date:</strong> {{ event.startDate | date:'mediumDate' }}</p>
              <p style="margin: 5px 0;"><strong>👥 Capacity:</strong> {{ event.currentParticipants }}/{{ event.maxParticipants }}</p>
              <p style="margin: 5px 0;"><strong>💰 Fee:</strong> {{ event.registrationFee > 0 ? '₹' + event.registrationFee : 'Free' }}</p>
              <p style="margin: 5px 0;"><strong>📞 Contact:</strong> {{ event.contactEmail }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class EventListComponent implements OnInit {
  events: Event[] = [];

  constructor(
    public eventService: EventService,
    public authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    console.log('Component initialized');
    this.loadEvents();
  }

  loadEvents() {
    console.log('Loading events...');
    this.eventService.getAllEvents().subscribe({
      next: (data) => {
        console.log('Events loaded:', data);
        console.log('Number of events:', data.length);
        this.events = data;
      },
      error: (err) => {
        console.error('Error loading events:', err);
      }
    });
  }

  getTypeColor(type: string): string {
    switch(type) {
      case 'technical': return '#3498db';
      case 'cultural': return '#9b59b6';
      case 'sports': return '#2ecc71';
      case 'workshop': return '#f39c12';
      case 'seminar': return '#e74c3c';
      default: return '#95a5a6';
    }
  }

  goToCreateEvent() {
    this.router.navigate(['/events/create']);
  }

  createTestEvent() {
    const testEvent = {
      title: 'Test Event ' + new Date().toLocaleTimeString(),
      description: 'Created from dashboard',
      type: 'technical',
      category: 'college',
      venue: 'Test Venue',
      startDate: new Date(),
      endDate: new Date(Date.now() + 86400000),
      registrationDeadline: new Date(),
      maxParticipants: 50,
      registrationFee: 0,
      organizer: 'Dashboard Tester',
      contactEmail: 'test@test.com'
    };

    this.eventService.createEvent(testEvent).subscribe({
      next: (res) => {
        console.log('Test event created:', res);
        this.loadEvents();
      },
      error: (err) => console.error('Error:', err)
    });
  }
}