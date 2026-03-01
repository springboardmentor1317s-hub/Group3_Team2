import { NgClass } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService } from '../../services/event.service';

interface Event {
  id: number;
  name: string;
  date: Date;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  registrations: number;
  capacity: number;
  averageParticipants?: number;
  location?: string;
  category?: string;
  imageUrl?: string;
  feedback?: { userId: any; rating: number; comment?: string; createdAt: Date; }[];
}

interface Registration {
  id: number;
  eventId: number;
  eventName: string;
  attendeeName: string;
  email: string;
  registrationDate: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  ticketType: string;
}

@Component({
  selector: 'app-event-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule, NgClass],
  templateUrl: './event-organizer-dashboard.component.html',
  styleUrls: ['./event-organizer-dashboard.component.css']
})
export class EventOrganizerDashboardComponent implements OnInit {
  // ========== VIEW STATE ==========
  currentView = signal<'overview' | 'events' | 'registrations' | 'payments' | 'reports' | 'settings'>('overview');

  // ========== STATISTICS ==========
  totalEvents: number = 0;
  activeEvents: number = 0;
  totalRegistrations: number = 0;
  averageParticipants: number = 0;

  // ========== DATA ARRAYS ==========
  events: Event[] = [];
  filteredEvents: Event[] = [];
  registrations: Registration[] = [];
  filteredRegistrations: Registration[] = [];

  // ========== UI STATE ==========
  selectedEventId: number | null = null;
  showCreateEventModal: boolean = false;
  showRegistrationsModal: boolean = false;
  showExportModal: boolean = false;
  selectedExportFormat: 'csv' | 'excel' | 'pdf' = 'csv';

  // ========== FILTERS ==========
  eventSearchTerm: string = '';
  eventStatusFilter: string = 'all';
  startDateFilter: string = '';
  endDateFilter: string = '';
  searchTerm: string = '';
  selectedStatus: string = 'all';

  // ========== FORM ==========
  createEventForm: FormGroup;

  // ========== CHART DATA (MOCK) ==========
  registrationTrendData: any;
  eventCategoryData: any;

  // ========== OPTIONS ==========
  statusOptions = ['all', 'active', 'upcoming', 'completed', 'cancelled'];
  typeOptions = ['technical', 'cultural', 'sports', 'workshop', 'seminar'];
  categoryOptions = ['college', 'inter-college'];
  exportFormatOptions = ['csv', 'excel', 'pdf'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private eventService: EventService
  ) {
    // Initialize form
    this.createEventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      time: ['', Validators.required],
      endDate: ['', Validators.required],
      registrationDeadline: ['', Validators.required],
      location: ['', Validators.required],
      type: ['technical', Validators.required],
      category: ['college', Validators.required],
      capacity: ['', [Validators.required, Validators.min(1)]],
      organizer: ['', Validators.required],
      imageUrl: [''],
      description: ['', Validators.required],
      ticketTypes: this.fb.group({
        regular: ['', Validators.min(0)],
        vip: ['', Validators.min(0)],
        earlyBird: ['', Validators.min(0)]
      })
    });
  }

  ngOnInit(): void {
    // Check if user is authorized (college-admin or superadmin)
    const role = this.authService.getRole();
    if (!this.authService.isLoggedIn() || (role !== 'college-admin' && role !== 'superadmin')) {
      this.router.navigate(['/login']);
      return;
    }

    console.log('College Admin Dashboard loaded, role:', role);
    this.loadDashboardData();
    this.initializeCharts();
  }

  // ========== VIEW SWITCHING ==========
  setView(view: 'overview' | 'events' | 'registrations' | 'payments' | 'reports' | 'settings'): void {
    this.currentView.set(view);
  }

  // ========== LOGOUT ==========
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Helper method to generate numeric ID from MongoDB ObjectId
  private generateNumericId(id: string): number {
    if (!id) return Math.floor(Math.random() * 10000);
    // Take last 4 characters of the ID and convert to number
    const lastChars = id.slice(-4);
    return parseInt(lastChars, 16) || Math.floor(Math.random() * 10000);
  }

  // Helper method to map API status to component status
  private mapStatus(status: string): 'active' | 'upcoming' | 'completed' | 'cancelled' {
    switch (status) {
      case 'ongoing': return 'active';
      case 'upcoming': return 'upcoming';
      case 'completed': return 'completed';
      case 'cancelled': return 'cancelled';
      default: return 'upcoming';
    }
  }

  // Helper method to map event type to category
  private mapTypeToCategory(type: string): string {
    const categoryMap: { [key: string]: string } = {
      'technical': 'Conference',
      'workshop': 'Workshop',
      'seminar': 'Seminar',
      'cultural': 'Meetup',
      'sports': 'Networking'
    };
    return categoryMap[type] || 'Conference';
  }

  // Mock data fallback
  private loadMockData(): void {
    console.log('Loading mock data');
    this.events = [
      { id: 1, name: 'Tech Conference 2024', date: new Date('2024-06-15'), status: 'active', registrations: 245, capacity: 300, averageParticipants: 235, location: 'Convention Center', category: 'Conference' },
      { id: 2, name: 'Start Up', date: new Date('2024-07-20'), status: 'upcoming', registrations: 75, capacity: 100, averageParticipants: 70, location: 'Tech Hub', category: 'Workshop' },
      { id: 3, name: 'Cultural Fest', date: new Date('2024-05-10'), status: 'completed', registrations: 120, capacity: 150, averageParticipants: 115, location: 'City Lounge', category: 'Networking' },
      { id: 4, name: 'AI Summit', date: new Date('2024-08-05'), status: 'active', registrations: 180, capacity: 250, averageParticipants: 175, location: 'Innovation Center', category: 'Conference' },
      { id: 5, name: 'Hackathon', date: new Date('2024-06-30'), status: 'upcoming', registrations: 45, capacity: 60, averageParticipants: 40, location: 'Creative Studio', category: 'Workshop' },
    ];
  }

  private calculateStatistics(): void {
    this.totalEvents = this.events.length;
    this.activeEvents = this.events.filter(e => e.status === 'active').length;
    this.totalRegistrations = this.events.reduce((sum, event) => sum + event.registrations, 0);
    this.averageParticipants = Math.round(
      this.events.reduce((sum, event) => sum + (event.averageParticipants || 0), 0) / this.events.length
    ) || 0;
  }

  private initializeCharts(): void {
    this.registrationTrendData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Registrations',
          data: [65, 85, 120, 145, 180, 245],
          fill: false,
          borderColor: '#4CAF50',
          tension: 0.4
        }
      ]
    };

    this.eventCategoryData = {
      labels: ['Conference', 'Workshop', 'Seminar', 'Meetup', 'Webinar', 'Networking'],
      datasets: [
        {
          data: [35, 25, 15, 10, 8, 7],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688']
        }
      ]
    };
  }

  openCreateEventModal(): void {
    this.showCreateEventModal = true;
  }

  closeCreateEventModal(): void {
    this.showCreateEventModal = false;
    this.createEventForm.reset();
  }

  // ========== FEEDBACK MODAL ==========
  showFeedbackModal = false;
  selectedEventFeedback: any[] = [];
  selectedEventName = '';
  averageRating = 0;

  openFeedbackModal(event: Event): void {
    this.selectedEventName = event.name;
    this.selectedEventFeedback = event.feedback || [];

    if (this.selectedEventFeedback.length > 0) {
      const sum = this.selectedEventFeedback.reduce((acc, f) => acc + f.rating, 0);
      this.averageRating = sum / this.selectedEventFeedback.length;
    } else {
      this.averageRating = 0;
    }

    this.showFeedbackModal = true;
  }

  closeFeedbackModal(): void {
    this.showFeedbackModal = false;
  }

  createEvent(): void {
    if (this.createEventForm.valid) {
      const formValue = this.createEventForm.value;
      const token = localStorage.getItem('token');

      if (!token) {
        alert('You must be logged in to create events');
        return;
      }

      // Prepare event data for API
      const eventData = {
        title: formValue.name,
        description: formValue.description || 'No description provided',
        type: formValue.type,
        category: formValue.category,
        venue: formValue.location,
        startDate: new Date(formValue.date + 'T' + (formValue.time || '00:00')).toISOString(),
        endDate: new Date(formValue.endDate).toISOString(),
        registrationDeadline: new Date(formValue.registrationDeadline).toISOString(),
        maxParticipants: formValue.capacity,
        imageUrl: formValue.imageUrl || 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?auto=format&fit=crop&q=80&w=800',
        registrationFee: 0,
        organizer: formValue.organizer,
        contactEmail: this.authService.getEmail() || 'admin@college.edu'
      };

      console.log('Sending event data to API:', eventData);

      // Call the event service to create event
      this.eventService.createEvent(eventData).subscribe({
        next: (data) => {
          console.log('✅ Event created successfully:', data);
          alert('Event created successfully!');
          this.closeCreateEventModal();
          this.loadDashboardData(); // Refresh the events list
        },
        error: (error) => {
          console.error('❌ Error creating event:', error);
          alert('Failed to create event: ' + (error.error?.message || 'Unknown error'));
        }
      });
    }
  }

  // Helper method to map category to event type
  private mapEventType(category: string): string {
    const typeMap: { [key: string]: string } = {
      'Conference': 'technical',
      'Workshop': 'workshop',
      'Seminar': 'seminar',
      'Meetup': 'cultural',
      'Webinar': 'technical',
      'Networking': 'cultural'
    };
    return typeMap[category] || 'technical';
  }

  onFilterChange(): void {
    this.loadDashboardData();
  }

  // Override loadDashboardData to support filters
  loadDashboardData(): void {
    const filters = {
      startDate: this.startDateFilter,
      endDate: this.endDateFilter,
      status: this.eventStatusFilter
    };

    this.eventService.getAllEvents(filters).subscribe({
      next: (apiEvents: any[]) => {
        this.events = apiEvents.map(event => ({
          id: this.generateNumericId(event._id || ''),
          name: event.title || '',
          date: event.startDate ? new Date(event.startDate) : new Date(),
          status: this.mapStatus(event.status || 'upcoming'),
          registrations: event.currentParticipants || 0,
          capacity: event.maxParticipants || 0,
          averageParticipants: event.currentParticipants || 0,
          location: event.venue || '',
          category: this.mapTypeToCategory(event.type || 'technical'),
          imageUrl: event.imageUrl,
          feedback: event.feedback || []
        }));
        this.filterEvents();
        this.calculateStatistics();
      }
    });
  }

  duplicateEvent(eventId: number): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      // Find the original event in API events to duplicate
      const apiEvents: any[] = [];
      this.eventService.getAllEvents().subscribe(events => {
        const originalEvent = events.find((e: any) => this.generateNumericId(e._id) === eventId);

        if (originalEvent) {
          const duplicatedEventData = {
            title: `${originalEvent.title} (Copy)`,
            description: originalEvent.description,
            type: originalEvent.type,
            category: originalEvent.category,
            venue: originalEvent.venue,
            startDate: new Date(originalEvent.startDate).toISOString(),
            endDate: new Date(originalEvent.endDate).toISOString(),
            registrationDeadline: new Date(originalEvent.registrationDeadline).toISOString(),
            maxParticipants: originalEvent.maxParticipants,
            registrationFee: originalEvent.registrationFee,
            organizer: this.authService.getFullName() || 'College Admin',
            contactEmail: this.authService.getEmail() || 'admin@college.edu'
          };

          this.eventService.createEvent(duplicatedEventData).subscribe({
            next: () => {
              alert('Event duplicated successfully!');
              this.loadDashboardData();
            },
            error: (err) => {
              console.error('Error duplicating event:', err);
              alert('Failed to duplicate event');
            }
          });
        }
      });
    }
  }

  cancelEvent(eventId: number): void {
    if (confirm('Are you sure you want to cancel this event?')) {
      // Find the event in the list
      const event = this.events.find(e => e.id === eventId);
      if (event) {
        // Update local state
        event.status = 'cancelled';
        this.filteredEvents = [...this.events];
        this.calculateStatistics();
        alert('Event cancelled successfully!');

        // TODO: Add API call to update event status in database
      }
    }
  }

  viewEventDetails(eventId: number): void {
    alert(`Viewing details for event ID: ${eventId}`);
  }

  // ========== FILTER METHODS ==========
  onStatusFilterChange(event: any): void {
    this.eventStatusFilter = event.target.value;
    this.filterEvents();
  }

  onEventSearch(event: any): void {
    this.eventSearchTerm = event.target.value;
    this.filterEvents();
  }

  filterEvents(): void {
    this.filteredEvents = this.events.filter(event => {
      const matchesStatus = this.eventStatusFilter === 'all' || event.status === this.eventStatusFilter;
      const matchesSearch = this.eventSearchTerm === '' ||
        event.name.toLowerCase().includes(this.eventSearchTerm.toLowerCase()) ||
        (event.location && event.location.toLowerCase().includes(this.eventSearchTerm.toLowerCase()));
      return matchesStatus && matchesSearch;
    });
  }

  // ========== REGISTRATION METHODS ==========
  viewAllRegistrations(): void {
    this.showRegistrationsModal = true;
    this.filteredRegistrations = [...this.registrations];
    this.searchTerm = '';
    this.selectedStatus = 'all';
  }

  closeRegistrationsModal(): void {
    this.showRegistrationsModal = false;
  }

  filterRegistrations(searchText: string): void {
    this.searchTerm = searchText;
    this.filterRegistrationsList();
  }

  filterRegistrationsByStatus(status: string): void {
    this.selectedStatus = status;
    this.filterRegistrationsList();
  }

  filterRegistrationsList(): void {
    this.filteredRegistrations = this.registrations.filter(reg => {
      const matchesSearch = this.searchTerm === '' ||
        reg.attendeeName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.eventName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.selectedStatus === 'all' || reg.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  updateRegistrationStatus(registrationId: number, newStatus: 'confirmed' | 'cancelled'): void {
    const registration = this.registrations.find(r => r.id === registrationId);
    if (registration) {
      const oldStatus = registration.status;
      registration.status = newStatus;
      this.filterRegistrationsList();

      const event = this.events.find(e => e.id === registration.eventId);
      if (event) {
        if (newStatus === 'confirmed' && oldStatus === 'pending') {
          event.registrations++;
          if (event.averageParticipants) {
            event.averageParticipants = Math.round((event.registrations + event.averageParticipants) / 2);
          }
        } else if (newStatus === 'cancelled' && oldStatus === 'confirmed') {
          event.registrations--;
        }
      }

      this.calculateStatistics();
      this.filteredEvents = [...this.events];
      alert(`Registration ${newStatus} successfully!`);
    }
  }

  // ========== EXPORT METHODS ==========
  openExportModal(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  onExportFormatChange(format: string): void {
    this.selectedExportFormat = format as 'csv' | 'excel' | 'pdf';
  }

  exportEventData(): void {
    alert(`Data exported as ${this.selectedExportFormat.toUpperCase()} successfully!`);
    this.closeExportModal();
  }

  // ========== ACTION CARD METHODS ==========
  sendAnnouncements(): void {
    alert('Send announcements functionality would open here');
  }

  manageTickets(): void {
    alert('Ticket management functionality would open here');
  }

  teamSettings(): void {
    alert('Team settings functionality would open here');
  }

  // ========== HELPER METHODS ==========
  getFormattedDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'status-active',
      'upcoming': 'status-upcoming',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  getRegistrationStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'confirmed': 'status-confirmed',
      'pending': 'status-pending',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  onChartFilterChange(event: any): void {
    const value = event.target.value;
    console.log('Chart filter changed:', value);
  }
}