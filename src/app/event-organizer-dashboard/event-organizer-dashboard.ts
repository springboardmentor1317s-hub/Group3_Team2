<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
import { AuthService } from '../services/auth.service';
import { Component, OnInit, signal } from '@angular/core';
=======
import { Component, OnInit, signal, effect } from '@angular/core';
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts

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
=======
import { AuthService } from '../../services/auth.service';
import { EventService, Event } from '../../services/event.service';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';

interface ApiEvent {
  _id: string; title: string; description: string; type: string; category: string;
  venue: string; startDate: Date; endDate: Date; registrationDeadline: Date;
  maxParticipants: number; currentParticipants: number; registrationFee: number;
  organizer: string; contactEmail: string; status: string; createdBy?: string;
  imageUrl?: string;
  feedback?: { userId: any; rating: number; comment?: string; createdAt: Date; fullName?: string; college?: string; }[];
}
interface Participant {
  registrationId: string;
  fullName: string;
  email: string;
  college: string;
  selectedSlot?: string;
  approvalStatus: 'pending' | 'approved' | 'rejected';
  paymentAmount?: number;
  paymentMethod?: string;
  paymentStatus?: string;
  rejectionReason?: string;
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

@Component({
  selector: 'app-event-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
  templateUrl: './event-organizer-dashboard.html',
  styleUrls: ['./event-organizer-dashboard.css']
})
export class EventOrganizerDashboard implements OnInit {
  // ========== VIEW STATE (NEW) ==========
  currentView = signal<'overview' | 'events' | 'registrations' | 'payments' | 'reports' | 'settings'>('overview');
=======
  templateUrl: './event-organizer-dashboard.component.html',
  styleUrls: ['./event-organizer-dashboard.component.css']
})
export class EventOrganizerDashboardComponent implements OnInit {
  currentView = signal<'overview' | 'events' | 'reports' | 'notifications' | 'analytics' | 'settings'>('overview');
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts

  totalEvents = 0;
  activeEvents = 0;
  totalRegistrations = 0;
  avgParticipants = 0;

  events: ApiEvent[] = [];
  filteredEvents: ApiEvent[] = [];

  // Filters
  eventSearchTerm = '';
  eventStatusFilter = 'all';
  eventTypeFilter = 'all';
  eventCategoryFilter = 'all';
  startDateFilter = '';
  endDateFilter = '';

<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
  // ========== FILTERS ==========
  eventSearchTerm: string = '';
  eventStatusFilter: string = 'all';
  searchTerm: string = '';
  selectedStatus: string = 'all';
=======
  // Modals
  showCreateModal = false;
  showEditModal = false;
  showFeedbackModal = false;
  showParticipantsModal = false;
  showRejectModal = false;
  showProfileModal = false;
  showNotifDropdown = false;
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts

  selectedEvent: ApiEvent | null = null;
  selectedEventFeedback: any[] = [];
  selectedEventName = '';
  averageRating = 0;
  participants: any[] = [];
  loadingParticipants = false;

  // Single reject
  rejectingRegistrationId = '';
  rejectReason = '';

  // Bulk actions
  selectedParticipantIds = new Set<string>();
  bulkActionStatus: 'pending' | 'success' | 'error' | null = null;
  bulkActionMessage = '';

  // Bulk reject
  showBulkRejectModal = false;
  bulkRejectReason = '';

  eventForm: FormGroup;
  isSubmitting = false;
  formError = '';

  // Image upload
  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
  // ========== OPTIONS ==========
  statusOptions = ['all', 'active', 'upcoming', 'completed', 'cancelled'];
  categoryOptions = ['Conference', 'Workshop', 'Seminar', 'Meetup', 'Webinar', 'Networking'];
  exportFormatOptions = ['csv', 'excel', 'pdf'];

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {
    // Initialize form
    this.createEventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      time: ['', Validators.required],
      location: ['', Validators.required],
      category: ['', Validators.required],
      capacity: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      ticketTypes: this.fb.group({
        regular: ['', Validators.min(0)],
        vip: ['', Validators.min(0)],
        earlyBird: ['', Validators.min(0)]
      })
    });
  }

  ngOnInit(): void {
    // Check if user is authorized (college admin)
    const role = this.authService.getRole();
    if (!this.authService.isLoggedIn() || (role !== 'college_admin' && role !== 'admin')) {
=======
  typeOptions = ['technical', 'cultural', 'sports', 'workshop', 'seminar'];
  categoryOptions = ['college', 'inter-college'];

  // NEW PROPERTIES
  notificationFilter: string = 'all';
  filteredNotifications: any[] = [];
  pendingApprovals: number = 0;
  notificationList: any[] = [];

  constructor(
    private fb: FormBuilder,
    public authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private chatService: ChatService,
    public notifService: NotificationService
  ) {
    this.eventForm = this.buildForm();
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;
      if (req === 'ADMIN_EVENTS') { this.setView('events'); }
      if (req === 'ADMIN_CREATE') { this.setView('events'); setTimeout(() => this.openCreate(), 100); }
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized(['college-admin', 'superadmin'])) {
      this.authService.logout();
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts
      this.router.navigate(['/login']);
      return;
    }
    this.loadEvents();
    this.notifService.reload();
    this.loadNotifications();
  }

<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
  // ========== VIEW SWITCHING (NEW) ==========
  setView(view: 'overview' | 'events' | 'registrations' | 'payments' | 'reports' | 'settings'): void {
    this.currentView.set(view);
=======
  // ── FORM ──────────────────────────────────────────────────────────────────
  private buildForm(data?: Partial<ApiEvent>): FormGroup {
    return this.fb.group({
      title: [data?.title || '', [Validators.required, Validators.minLength(3)]],
      description: [data?.description || '', Validators.required],
      type: [data?.type || 'technical', Validators.required],
      category: [data?.category || 'college', Validators.required],
      venue: [data?.venue || '', Validators.required],
      startDate: [data?.startDate ? this.toDatetimeLocal(new Date(data.startDate)) : '', Validators.required],
      endDate: [data?.endDate ? this.toDatetimeLocal(new Date(data.endDate)) : '', Validators.required],
      registrationDeadline: [data?.registrationDeadline ? this.toDatetimeLocal(new Date(data.registrationDeadline)) : '', Validators.required],
      maxParticipants: [data?.maxParticipants || 100, [Validators.required, Validators.min(1)]],
      registrationFee: [data?.registrationFee ?? 0, Validators.min(0)],
      organizer: [data?.organizer || this.authService.getFullName() || '', Validators.required],
      contactEmail: [data?.contactEmail || this.authService.getEmail() || '', [Validators.required, Validators.email]]
    });
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts
  }

  private toDatetimeLocal(d: Date): string {
    return d.toISOString().slice(0, 16);
  }

  setView(v: 'overview' | 'events' | 'reports' | 'notifications' | 'analytics' | 'settings') {
    this.currentView.set(v);
    if (v === 'notifications') {
      this.loadNotifications();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

<<<<<<< HEAD:src/app/event-organizer-dashboard/event-organizer-dashboard.ts
  // ========== DATA LOADING ==========
  private loadDashboardData(): void {
    // Mock events data
    this.events = [
      { id: 1, name: 'Tech Conference 2024', date: new Date('2024-06-15'), status: 'active', registrations: 245, capacity: 300, averageParticipants: 235, location: 'Convention Center', category: 'Conference' },
      { id: 2, name: 'Start Up', date: new Date('2024-07-20'), status: 'upcoming', registrations: 75, capacity: 100, averageParticipants: 70, location: 'Tech Hub', category: 'Workshop' },
      { id: 3, name: 'Cultural Fest', date: new Date('2024-05-10'), status: 'completed', registrations: 120, capacity: 150, averageParticipants: 115, location: 'City Lounge', category: 'Networking' },
      { id: 4, name: 'AI Summit', date: new Date('2024-08-05'), status: 'active', registrations: 180, capacity: 250, averageParticipants: 175, location: 'Innovation Center', category: 'Conference' },
      { id: 5, name: 'Hackathon', date: new Date('2024-06-30'), status: 'upcoming', registrations: 45, capacity: 60, averageParticipants: 40, location: 'Creative Studio', category: 'Workshop' },
    ];

    // Mock registrations data
    this.registrations = [
      { id: 1, eventId: 1, eventName: 'Tech Conference', attendeeName: 'Sneha M', email: 'sneha123@example.com', registrationDate: new Date('2024-05-01'), status: 'confirmed', ticketType: 'VIP' },
      { id: 2, eventId: 1, eventName: 'Cultural Fest', attendeeName: 'Riya Jane', email: 'jane@example.com', registrationDate: new Date('2024-05-02'), status: 'confirmed', ticketType: 'Regular' },
      { id: 3, eventId: 2, eventName: 'Start Up', attendeeName: 'Suzy Dsouza', email: 'suzy@example.com', registrationDate: new Date('2024-05-03'), status: 'pending', ticketType: 'Early Bird' },
      { id: 4, eventId: 1, eventName: 'Tech Conference', attendeeName: 'Alice Williams', email: 'alice@example.com', registrationDate: new Date('2024-05-04'), status: 'confirmed', ticketType: 'Regular' },
      { id: 5, eventId: 3, eventName: 'Networking Mixer', attendeeName: 'Chris Brown', email: 'chris701@example.com', registrationDate: new Date('2024-04-15'), status: 'confirmed', ticketType: 'Regular' },
      { id: 6, eventId: 4, eventName: 'AI Summit', attendeeName: 'Diana Prisley', email: 'diana@example.com', registrationDate: new Date('2024-05-10'), status: 'pending', ticketType: 'VIP' },
      { id: 7, eventId: 2, eventName: 'Hackathon', attendeeName: 'Evan Jain', email: 'evan@example.com', registrationDate: new Date('2024-05-11'), status: 'cancelled', ticketType: 'Regular' },
    ];

    this.filteredEvents = [...this.events];
    this.filteredRegistrations = [...this.registrations];
    this.calculateStatistics();
  }

  private calculateStatistics(): void {
    this.totalEvents = this.events.length;
    this.activeEvents = this.events.filter(e => e.status === 'active').length;
    this.totalRegistrations = this.events.reduce((sum, event) => sum + event.registrations, 0);
    this.averageParticipants = Math.round(
      this.events.reduce((sum, event) => sum + (event.averageParticipants || 0), 0) / this.events.length
    );
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

  // ========== EVENT METHODS ==========
  openCreateEventModal(): void {
    this.showCreateEventModal = true;
  }

  closeCreateEventModal(): void {
    this.showCreateEventModal = false;
    this.createEventForm.reset();
  }

  createEvent(): void {
    if (this.createEventForm.valid) {
      const formValue = this.createEventForm.value;
      const newEvent: Event = {
        id: this.events.length + 1,
        name: formValue.name,
        date: new Date(formValue.date),
        status: 'upcoming',
        registrations: 0,
        capacity: formValue.capacity,
        averageParticipants: 0,
        location: formValue.location,
        category: formValue.category
      };

      this.events.push(newEvent);
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      this.closeCreateEventModal();
      alert('Event created successfully!');
    }
  }

  duplicateEvent(eventId: number): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      const duplicatedEvent: Event = {
        ...event,
        id: this.events.length + 1,
        name: `${event.name} (Copy)`,
        status: 'upcoming',
        registrations: 0,
        averageParticipants: 0
      };
      this.events.push(duplicatedEvent);
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      alert('Event duplicated successfully!');
    }
  }

  cancelEvent(eventId: number): void {
    const event = this.events.find(e => e.id === eventId);
    if (event && confirm('Are you sure you want to cancel this event?')) {
      event.status = 'cancelled';
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      alert('Event cancelled successfully!');
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
        event.name.toLowerCase().includes(this.eventSearchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
=======
  // ── LOAD & FILTER ────────────────────────────────────────────────────────
  loadEvents() {
    const filters: any = {};
    if (this.startDateFilter) filters.startDate = this.startDateFilter;
    if (this.endDateFilter) filters.endDate = this.endDateFilter;
    if (this.eventStatusFilter !== 'all') filters.status = this.eventStatusFilter;
    if (this.eventTypeFilter !== 'all') filters.type = this.eventTypeFilter;
    if (this.eventCategoryFilter !== 'all') filters.category = this.eventCategoryFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (evts: any[]) => {
        const userId = this.authService.getUserId();
        this.events = (evts as ApiEvent[])
          .filter(e => this.authService.getRole() === 'superadmin' || String(e.createdBy) === String(userId))
          .map(e => ({ ...e, status: this.eventService.computeStatus ? this.eventService.computeStatus(e) : e.status }));
        this.applyLocalFilters();
        this.calcStats();
      },
      error: () => {
        this.events = [];
        this.filteredEvents = [];
      }
    });
  }

  applyLocalFilters() {
    const term = this.eventSearchTerm.toLowerCase().trim();
    this.filteredEvents = this.events.filter(e => {
      if (term && !(
        e.title?.toLowerCase().includes(term) ||
        e.venue?.toLowerCase().includes(term) ||
        e.organizer?.toLowerCase().includes(term)
      )) return false;
      return true;
    });
  }

  onSearch() { this.applyLocalFilters(); }
  onFilterChange() { this.applyLocalFilters(); this.loadEvents(); }

  clearFilters() {
    this.eventSearchTerm = '';
    this.eventStatusFilter = 'all';
    this.eventTypeFilter = 'all';
    this.eventCategoryFilter = 'all';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.loadEvents();
  }

  calcStats() {
    this.totalEvents = this.events.length;
    this.activeEvents = this.events.filter(e => e.status === 'upcoming' || e.status === 'ongoing').length;
    this.totalRegistrations = this.events.reduce((s, e) => s + (e.currentParticipants || 0), 0);
    this.avgParticipants = this.totalEvents > 0 ? Math.round(this.totalRegistrations / this.totalEvents) : 0;
  }

  // ── IMAGE ────────────────────────────────────────────────────────────────
  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) {
      this.formError = 'Only JPEG, PNG, GIF or WebP.';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      this.formError = 'Image must be < 5 MB.';
      return;
    }
    this.selectedImageFile = file;
    this.formError = '';
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreviewUrl = e.target.result; };
    reader.readAsDataURL(file);
  }

  clearImage() {
    this.selectedImageFile = null;
    this.imagePreviewUrl = '';
  }

  private buildPayload(): FormData | any {
    const v = this.eventForm.value;
    const fields: Record<string, string> = {
      title: v.title,
      description: v.description,
      type: v.type,
      category: v.category,
      venue: v.venue,
      startDate: new Date(v.startDate).toISOString(),
      endDate: new Date(v.endDate).toISOString(),
      registrationDeadline: new Date(v.registrationDeadline).toISOString(),
      maxParticipants: String(Number(v.maxParticipants)),
      registrationFee: String(Number(v.registrationFee) || 0),
      organizer: v.organizer,
      contactEmail: v.contactEmail
    };
    if (this.selectedImageFile) {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, val]) => fd.append(k, val));
      fd.append('image', this.selectedImageFile);
      return fd;
    }
    return fields;
  }

  // ── CREATE ───────────────────────────────────────────────────────────────
  openCreate() {
    this.eventForm = this.buildForm();
    this.formError = '';
    this.clearImage();
    this.showCreateModal = true;
  }

  closeCreate() {
    this.showCreateModal = false;
    this.clearImage();
  }

  submitCreate() {
    if (this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.formError = '';
    this.eventService.createEvent(this.buildPayload()).subscribe({
      next: () => {
        this.showCreateModal = false;
        this.clearImage();
        this.loadEvents();
      },
      error: (err) => {
        this.formError = err.error?.message || 'Failed to create event';
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  // ── EDIT ─────────────────────────────────────────────────────────────────
  openEdit(event: ApiEvent) {
    this.selectedEvent = event;
    this.eventForm = this.buildForm(event);
    this.formError = '';
    this.selectedImageFile = null;
    this.imagePreviewUrl = event.imageUrl || '';
    this.showEditModal = true;
  }

  closeEdit() {
    this.showEditModal = false;
    this.selectedEvent = null;
    this.clearImage();
  }

  submitEdit() {
    if (!this.selectedEvent || this.eventForm.invalid) {
      this.eventForm.markAllAsTouched();
      return;
    }
    this.isSubmitting = true;
    this.formError = '';
    this.eventService.updateEvent(this.selectedEvent._id, this.buildPayload()).subscribe({
      next: () => {
        this.showEditModal = false;
        this.clearImage();
        this.loadEvents();
      },
      error: (err) => {
        this.formError = err.error?.message || 'Failed to update event';
        this.isSubmitting = false;
      },
      complete: () => this.isSubmitting = false
    });
  }

  // ── CANCEL / DELETE ───────────────────────────────────────────────────────
  cancelEvent(event: ApiEvent) {
    if (!confirm(`Cancel "${event.title}"?`)) return;
    this.eventService.updateEvent(event._id, { status: 'cancelled' }).subscribe({
      next: () => this.loadEvents(),
      error: (err) => alert(err.error?.message || 'Cannot cancel')
    });
  }

  deleteEvent(event: ApiEvent) {
    if (!confirm(`Permanently delete "${event.title}"?`)) return;
    this.eventService.deleteEvent(event._id).subscribe({
      next: () => this.loadEvents(),
      error: (err) => alert(err.error?.message || 'Cannot delete')
    });
  }

  // ─── FEEDBACK ─────────────────────────────────────────────────────────────
  // ✅ FIXED: This method now properly loads feedback data from the event
  openFeedback(event: ApiEvent) {
    console.log('🔵 Opening feedback modal for:', event.title);
    this.selectedEventName = event.title;
    
    // Map feedback to include user details if available
    this.selectedEventFeedback = (event.feedback || []).map(fb => ({
      ...fb,
      fullName: fb.fullName || 'Anonymous Student',
      college: fb.college || '—',
      rating: fb.rating || 0,
      comment: fb.comment || '',
      createdAt: fb.createdAt || new Date()
    }));
    
    this.averageRating = this.selectedEventFeedback.length
      ? this.selectedEventFeedback.reduce((s, f) => s + (f.rating || 0), 0) / this.selectedEventFeedback.length
      : 0;
    
    console.log(`📊 Loaded ${this.selectedEventFeedback.length} feedback entries, Average rating: ${this.averageRating}`);
    this.showFeedbackModal = true;
  }

  closeFeedback() {
    this.showFeedbackModal = false;
    this.selectedEventFeedback = [];
  }

  // ── PARTICIPANTS MODAL ────────────────────────────────────────────────────
  openParticipants(event: ApiEvent) {
    this.selectedEvent = event;
    this.selectedEventName = event.title;
    this.participants = [];
    this.loadingParticipants = true;
    this.selectedParticipantIds.clear();
    this.bulkActionStatus = null;
    this.showParticipantsModal = true;

    this.eventService.getEventRegistrations(event._id).subscribe({
      next: (data: any) => {
        const raw = data.registrations || [];
        this.participants = raw.map((p: any) => ({
          ...p,
          registrationId: String(p.registrationId || p._id || '')
        }));
        this.loadingParticipants = false;
      },
      error: (err: any) => {
        console.error('[Participants error]', err);
        this.participants = [];
        this.loadingParticipants = false;
      }
    });
  }

  closeParticipants() {
    this.showParticipantsModal = false;
  }

  // ── SINGLE APPROVE/REJECT ─────────────────────────────────────────────────
  approveRegistration(regId: string) {
    if (!regId || regId === 'undefined') {
      alert('Registration ID is missing. Please close and reopen the participants panel.');
      return;
    }
    this.eventService.bulkUpdateRegistrationStatus([regId], 'approved').subscribe({
      next: () => {
        const p = this.participants.find(p => String(p.registrationId) === String(regId));
        if (p) p.approvalStatus = 'approved';
        this.notifService.reload();
        this.loadNotifications();
        this.bulkActionStatus = 'success';
        this.bulkActionMessage = 'Registration approved!';
        setTimeout(() => this.bulkActionStatus = null, 3000);
      },
      error: (err) => alert(err.error?.message || 'Failed to approve')
    });
  }

  openRejectModal(regId: string) {
    if (!regId) {
      alert('Registration ID is missing. Please close and reopen the participants panel.');
      return;
    }
    this.rejectingRegistrationId = String(regId);
    this.rejectReason = '';
    this.showRejectModal = true;
  }

  closeRejectModal() {
    this.showRejectModal = false;
    this.rejectingRegistrationId = '';
  }

  confirmReject() {
    if (!this.rejectingRegistrationId || this.rejectingRegistrationId === 'undefined') {
      alert('Registration ID is missing. Please close and reopen the participants panel.');
      return;
    }
    this.eventService.bulkUpdateRegistrationStatus([this.rejectingRegistrationId], 'rejected', this.rejectReason).subscribe({
      next: () => {
        const p = this.participants.find(p => String(p.registrationId) === String(this.rejectingRegistrationId));
        if (p) {
          p.approvalStatus = 'rejected';
          p.rejectionReason = this.rejectReason;
        }
        this.closeRejectModal();
        this.notifService.reload();
        this.loadNotifications();
        this.bulkActionStatus = 'success';
        this.bulkActionMessage = 'Registration rejected.';
        setTimeout(() => this.bulkActionStatus = null, 3000);
      },
      error: (err) => alert(err.error?.message || 'Failed to reject')
>>>>>>> Tasmiya:frontend/src/app/pages/event-organizer-dashboard/event-organizer-dashboard.component.ts
    });
  }

  // ── BULK SELECT ───────────────────────────────────────────────────────────
  toggleParticipantSelection(id: string) {
    const sid = String(id);
    if (this.selectedParticipantIds.has(sid)) {
      this.selectedParticipantIds.delete(sid);
    } else {
      this.selectedParticipantIds.add(sid);
    }
  }

  isAllSelected() {
    return this.participants.length > 0 && this.selectedParticipantIds.size === this.participants.length;
  }

  toggleSelectAll() {
    if (this.isAllSelected()) {
      this.selectedParticipantIds.clear();
    } else {
      this.participants.forEach(p => this.selectedParticipantIds.add(String(p.registrationId)));
    }
  }

  // ── BULK APPROVE ──────────────────────────────────────────────────────────
  bulkApprove() {
    if (this.selectedParticipantIds.size === 0) return;
    const ids = Array.from(this.selectedParticipantIds).map(id => String(id));
    this.bulkActionStatus = 'pending';
    this.eventService.bulkUpdateRegistrationStatus(ids, 'approved').subscribe({
      next: (res: any) => {
        this.bulkActionStatus = 'success';
        this.bulkActionMessage = res.message || 'Successfully approved';
        this.participants.forEach(p => {
          if (this.selectedParticipantIds.has(String(p.registrationId))) {
            p.approvalStatus = 'approved';
          }
        });
        this.selectedParticipantIds.clear();
        this.notifService.reload();
        this.loadNotifications();
        setTimeout(() => this.bulkActionStatus = null, 3000);
      },
      error: (err) => {
        this.bulkActionStatus = 'error';
        this.bulkActionMessage = err.error?.message || 'Failed';
      }
    });
  }

  // ── BULK REJECT ───────────────────────────────────────────────────────────
  openBulkRejectModal() {
    if (this.selectedParticipantIds.size === 0) return;
    this.bulkRejectReason = '';
    this.showBulkRejectModal = true;
  }

  closeBulkRejectModal() {
    this.showBulkRejectModal = false;
  }

  confirmBulkReject() {
    const ids = Array.from(this.selectedParticipantIds);
    this.bulkActionStatus = 'pending';
    this.eventService.bulkUpdateRegistrationStatus(ids, 'rejected', this.bulkRejectReason).subscribe({
      next: (res: any) => {
        this.bulkActionStatus = 'success';
        this.bulkActionMessage = res.message || 'Successfully rejected';
        this.participants.forEach(p => {
          if (this.selectedParticipantIds.has(p.registrationId)) {
            p.approvalStatus = 'rejected';
            p.rejectionReason = this.bulkRejectReason;
          }
        });
        this.selectedParticipantIds.clear();
        this.closeBulkRejectModal();
        this.notifService.reload();
        this.loadNotifications();
        setTimeout(() => this.bulkActionStatus = null, 3000);
      },
      error: (err) => {
        this.bulkActionStatus = 'error';
        this.bulkActionMessage = err.error?.message || 'Failed';
      }
    });
  }

  // ── NOTIFICATIONS ─────────────────────────────────────────────────────────
  getNotificationList() {
    return this.notifService.notifications();
  }

  getUnreadCount() {
    return this.notifService.unreadCount;
  }

  toggleNotifDropdown() {
    this.showNotifDropdown = !this.showNotifDropdown;
    if (this.showNotifDropdown) {
      this.loadNotifications();
    }
  }

  closeNotifDropdown() {
    setTimeout(() => {
      this.showNotifDropdown = false;
    }, 200);
  }

  markNotifRead(n: any) {
    this.notifService.markRead(n._id);
    this.loadNotifications();
  }

  markAllNotifsRead() {
    this.notifService.markAllRead();
    this.loadNotifications();
  }

  deleteNotif(n: any) {
    this.notifService.delete(n._id);
    this.loadNotifications();
  }

  // ── PROFILE MODAL ─────────────────────────────────────────────────────────
  openProfileModal() {
    this.showProfileModal = true;
    this.showNotifDropdown = false;
  }

  closeProfileModal() {
    this.showProfileModal = false;
  }

  getInitial(): string {
    return this.authService.getFullName()?.charAt(0)?.toUpperCase() || 'A';
  }

  getFullName(): string {
    return this.authService.getFullName() || 'Admin';
  }

  getEmail(): string {
    return this.authService.getEmail() || '';
  }

  getRole(): string {
    return this.authService.getRole() || 'college-admin';
  }

  getCollege(): string {
    return (this.authService.getUser() as any)?.college || '—';
  }

  // ── CSV ───────────────────────────────────────────────────────────────────
  exportCSV() {
    const rows = [
      ['Title', 'Type', 'Category', 'Venue', 'Start Date', 'Registrations', 'Capacity', 'Fee', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`,
        e.type,
        e.category,
        `"${e.venue}"`,
        this.formatDate(e.startDate),
        e.currentParticipants,
        e.maxParticipants,
        e.registrationFee > 0 ? e.registrationFee : 'Free',
        e.status
      ])
    ];
    this.downloadCSV(rows, 'events-export');
  }

  exportRegistrationsCSV() {
    const rows = [
      ['Event', 'Type', 'Total Registrations', 'Capacity', 'Fill Rate (%)', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`,
        e.type,
        e.currentParticipants,
        e.maxParticipants,
        e.maxParticipants > 0 ? Math.round((e.currentParticipants / e.maxParticipants) * 100) : 0,
        e.status
      ])
    ];
    this.downloadCSV(rows, 'registrations-summary');
  }

  private downloadCSV(rows: any[][], filename: string) {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  getStatusClass(s: string) {
    return {
      'badge-upcoming': s === 'upcoming',
      'badge-ongoing': s === 'ongoing',
      'badge-completed': s === 'completed',
      'badge-cancelled': s === 'cancelled'
    };
  }

  formatDate(d: any): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  formatDateTime(d: any): string {
    if (!d) return '';
    return new Date(d).toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  getStars(r: number): string {
    return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r));
  }

  getDefaultImage(): string {
    return DEFAULT_IMAGE;
  }

  getF(name: string) {
    return this.eventForm.get(name);
  }

  hasErr(name: string, err: string) {
    const c = this.getF(name);
    return c?.hasError(err) && c.touched;
  }

  getNotifIcon(type: string): string {
    const map: any = {
      'new-registration': '📋',
      'registration-approved': '✅',
      'registration-rejected': '❌',
      'event-update': '📢',
      'general': '🔔'
    };
    return map[type] || '🔔';
  }

  // ✅ ===== NEW METHODS FOR ENHANCED DASHBOARD =====

  getTimeOfDay(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Morning';
    if (hour < 17) return 'Afternoon';
    return 'Evening';
  }

  getCurrentDate(): string {
    return new Date().toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  getTimeAgo(date: Date): string {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now.getTime() - past.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return past.toLocaleDateString();
  }

  loadNotifications() {
    const notifications = this.notifService.notifications();
    this.notificationList = notifications;
    this.pendingApprovals = notifications.filter(
      (n: any) => n.type === 'new-registration' && !n.read
    ).length;
    this.filterNotifications(this.notificationFilter);
  }

  filterNotifications(filter: string) {
    this.notificationFilter = filter;
    const notifications = this.notifService.notifications();
    
    if (!notifications || notifications.length === 0) {
      this.filteredNotifications = [];
      return;
    }
    
    switch(filter) {
      case 'unread':
        this.filteredNotifications = notifications.filter((n: any) => !n.read);
        break;
      case 'registrations':
        this.filteredNotifications = notifications.filter(
          (n: any) => n.type?.includes('registration')
        );
        break;
      case 'events':
        this.filteredNotifications = notifications.filter(
          (n: any) => n.type?.includes('event')
        );
        break;
      case 'system':
        this.filteredNotifications = notifications.filter(
          (n: any) => n.type === 'system' || n.type === 'general'
        );
        break;
      default:
        this.filteredNotifications = [...notifications];
    }
  }

  refreshNotifications() {
    this.notifService.reload();
    setTimeout(() => {
      this.loadNotifications();
    }, 100);
  }

  handleNotificationClick(n: any) {
    if (n.type === 'new-registration' && n.data?.eventId) {
      this.openParticipantsFromNotif(n.data.eventId);
    } else if (n.type?.includes('event')) {
      this.setView('events');
    }
  }

  openParticipantsFromNotif(eventId: string) {
    const event = this.events.find(e => e._id === eventId);
    if (event) {
      this.openParticipants(event);
    }
  }

  getTopEvents(): any[] {
    return [...this.events]
      .sort((a, b) => (b.currentParticipants || 0) - (a.currentParticipants || 0))
      .slice(0, 5);
  }

  getCompletionRate(): number {
    if (this.events.length === 0) return 0;
    const completed = this.events.filter(e => e.status === 'completed').length;
    return Math.round((completed / this.events.length) * 100);
  }

  toggleDarkMode() {
    document.body.classList.toggle('dark-theme');
  }

  backupData() {
    alert('Backup feature coming soon!');
  }
}