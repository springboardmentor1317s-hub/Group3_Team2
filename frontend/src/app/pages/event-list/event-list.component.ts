import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService, Event } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
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

      <!-- Filter Section -->
      <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.05);">
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label style="font-size: 12px; color: #666; font-weight: 600;">From Date</label>
            <input type="date" [(ngModel)]="filters.startDate" (change)="loadEvents()"
                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label style="font-size: 12px; color: #666; font-weight: 600;">To Date</label>
            <input type="date" [(ngModel)]="filters.endDate" (change)="loadEvents()"
                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label style="font-size: 12px; color: #666; font-weight: 600;">Category</label>
            <select [(ngModel)]="filters.type" (change)="loadEvents()"
                    style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
              <option value="all">All Categories</option>
              <option value="technical">Technical</option>
              <option value="cultural">Cultural</option>
              <option value="sports">Sports</option>
              <option value="workshop">Workshop</option>
              <option value="seminar">Seminar</option>
            </select>
          </div>
          <div style="display: flex; flex-direction: column; gap: 5px;">
            <label style="font-size: 12px; color: #666; font-weight: 600;">College / Organizer</label>
            <input type="text" [(ngModel)]="filters.organizer" (keyup)="onOrganizerSearch()"
                   placeholder="Search college..."
                   style="padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
          </div>
        </div>
      </div>

      <!-- Empty State -->
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
             style="border: 1px solid #ddd; border-radius: 8px; overflow: hidden; background: white; box-shadow: 0 4px 12px rgba(0,0,0,0.1); transition: transform 0.3s;"
             onmouseover="this.style.transform='translateY(-5px)'"
             onmouseout="this.style.transform='translateY(0)'">

          <!-- Event Image -->
          <div style="height: 180px; overflow: hidden; position: relative;">
            <img [src]="event.imageUrl || 'assets/default-event.jpg'"
                 [alt]="event.title"
                 style="width: 100%; height: 100%; object-fit: cover;">
            <div [style.background]="getTypeColor(event.type)"
                 style="position: absolute; top: 10px; right: 10px; padding: 4px 12px; color: white; border-radius: 20px; font-size: 12px; font-weight: 600; text-transform: uppercase;">
              {{ event.type }}
            </div>
          </div>

          <!-- Event Content -->
          <div style="padding: 20px;">
            <h3 style="margin: 0 0 10px; color: #2c3e50; font-size: 1.25rem;">{{ event.title }}</h3>
            <p style="color: #636e72; font-size: 14px; margin-bottom: 15px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden;">
              {{ event.description }}
            </p>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 13px; color: #2d3436; margin-bottom: 15px;">
              <div><strong>📍</strong> {{ event.venue }}</div>
              <div><strong>📅</strong> {{ event.startDate | date:'mediumDate' }}</div>
              <div><strong>👥</strong> {{ event.currentParticipants }}/{{ event.maxParticipants }}</div>
              <div><strong>💰</strong> <span style="color: #27ae60; font-weight: 600;">{{ event.registrationFee > 0 ? '₹' + event.registrationFee : 'Free' }}</span></div>
              <div style="grid-column: 1/-1;"><strong>🏛️</strong> {{ event.organizer }}</div>
            </div>

            <!-- Registration Button (student role only) -->
            <ng-container *ngIf="authService.getRole() === 'student'">
              <button *ngIf="!isRegistered(event._id!)"
                      (click)="registerForEvent(event)"
                      style="width: 100%; padding: 10px; background: #3498db; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;"
                      onmouseover="this.style.background='#2980b9'"
                      onmouseout="this.style.background='#3498db'">
                ✅ Register Now
              </button>
              <button *ngIf="isRegistered(event._id!)"
                      (click)="unregisterFromEvent(event)"
                      style="width: 100%; padding: 10px; background: #e74c3c; color: white; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; transition: background 0.2s;"
                      onmouseover="this.style.background='#c0392b'"
                      onmouseout="this.style.background='#e74c3c'">
                ❌ Cancel Registration
              </button>
            </ng-container>
            <p *ngIf="authService.getRole() !== 'student'"
               style="text-align: center; color: #999; font-size: 13px; margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 6px;">
              Login as a student to register
            </p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: []
})
export class EventListComponent implements OnInit {
  events: Event[] = [];
  registeredEventIds: Set<string> = new Set();
  filters = {
    startDate: '',
    endDate: '',
    type: 'all',
    organizer: ''
  };

  private searchTimeout: any;

  constructor(
    public eventService: EventService,
    public authService: AuthService,
    private router: Router
  ) { }

  ngOnInit() {
    this.loadEvents();
    this.loadMyRegistrations();
  }

  loadMyRegistrations() {
    if (this.authService.getRole() === 'student') {
      this.eventService.getMyRegistrations().subscribe({
        next: (data: any) => {
          const list = Array.isArray(data) ? data : (data.events || []);
          this.registeredEventIds = new Set(list.map((ev: any) => ev._id || ev.id));
        },
        error: () => {}
      });
    }
  }

  loadEvents() {
    this.eventService.getAllEvents(this.filters).subscribe({
      next: (data) => {
        this.events = data;
      },
      error: (err) => {
        console.error('Error loading events:', err);
      }
    });
  }

  onOrganizerSearch() {
    if (this.searchTimeout) {
      clearTimeout(this.searchTimeout);
    }
    this.searchTimeout = setTimeout(() => {
      this.loadEvents();
    }, 500);
  }

  getTypeColor(type: string): string {
    switch (type) {
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
      registrationDeadline: new Date(Date.now() + 43200000),
      maxParticipants: 50,
      registrationFee: 0,
      organizer: 'Dashboard Tester',
      contactEmail: 'test@test.com'
    };
    this.eventService.createEvent(testEvent).subscribe({
      next: () => this.loadEvents(),
      error: (err) => console.error('Error:', err)
    });
  }

  /** Check if current user is registered for an event */
  isRegistered(eventId: string): boolean {
    return this.registeredEventIds.has(eventId);
  }

  /** Register student for an event via real API */
  registerForEvent(event: any): void {
    if (!event._id) return;
    this.eventService.registerForEvent(event._id).subscribe({
      next: (res: any) => {
        this.registeredEventIds.add(event._id);
        this.events = this.events.map((e: any) =>
          e._id === event._id ? { ...e, currentParticipants: (e.currentParticipants || 0) + 1 } : e
        );
        alert('Registered successfully! ' + (res.message || ''));
      },
      error: (err: any) => {
        alert(err.error?.message || 'Registration failed. Please log in as a student.');
      }
    });
  }

  /** Unregister student from an event via real API */
  unregisterFromEvent(event: any): void {
    if (!event._id) return;
    if (!confirm('Cancel registration for "' + event.title + '"?')) return;
    this.eventService.unregisterFromEvent(event._id).subscribe({
      next: (res: any) => {
        this.registeredEventIds.delete(event._id);
        this.events = this.events.map((e: any) =>
          e._id === event._id ? { ...e, currentParticipants: Math.max(0, (e.currentParticipants || 0) - 1) } : e
        );
        alert('Registration cancelled. ' + (res.message || ''));
      },
      error: (err: any) => {
        alert(err.error?.message || 'Could not cancel registration. Please try again.');
      }
    });
  }
}