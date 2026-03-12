import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EventService, Event } from '../../services/event.service';
import { ChatService } from '../../services/chat.service';

interface ApiEvent {
  _id: string; title: string; description: string; type: string; category: string;
  venue: string; startDate: Date; endDate: Date; registrationDeadline: Date;
  maxParticipants: number; currentParticipants: number; registrationFee: number;
  organizer: string; contactEmail: string; status: string; createdBy?: string;
  imageUrl?: string;
  availableSlots?: string[];
  feedback?: { userId: any; rating: number; comment?: string; createdAt: Date; }[];
}
interface Participant { _id: string; user_id: string; fullName: string; email: string; college: string; slot?: string; status: string; timestamp: string; }

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

@Component({
  selector: 'app-event-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-organizer-dashboard.component.html',
  styleUrls: ['./event-organizer-dashboard.component.css']
})
export class EventOrganizerDashboardComponent implements OnInit {
  currentView = signal<'overview' | 'events' | 'reports'>('overview');

  totalEvents = 0; activeEvents = 0; totalRegistrations = 0; avgParticipants = 0;

  events: ApiEvent[] = []; filteredEvents: ApiEvent[] = [];

  // Filters
  eventSearchTerm     = '';
  eventStatusFilter   = 'all';
  eventTypeFilter     = 'all';
  eventCategoryFilter = 'all';
  startDateFilter     = '';
  endDateFilter       = '';

  // Modals
  showCreateModal = false; showEditModal = false;
  showFeedbackModal = false; showParticipantsModal = false;

  selectedEvent: ApiEvent | null = null;
  selectedEventFeedback: any[] = []; selectedEventName = '';
  averageRating = 0; participants: Participant[] = []; loadingParticipants = false;
  statusMessage: { text: string; type: 'success' | 'error' } | null = null;
  selectedRegistrations = new Set<string>(); // Tracks checkboxes

  eventForm: FormGroup; isSubmitting = false; formError = '';

  // Image upload
  selectedImageFile: File | null = null;
  imagePreviewUrl = '';

  typeOptions     = ['technical', 'cultural', 'sports', 'workshop', 'seminar'];
  categoryOptions = ['college', 'inter-college'];

  constructor(
    private fb: FormBuilder, public authService: AuthService,
    private router: Router, private eventService: EventService, private chatService: ChatService
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
      this.authService.logout(); this.router.navigate(['/login']); return;
    }
    this.loadEvents();
  }

  private buildForm(data?: Partial<ApiEvent>): FormGroup {
    return this.fb.group({
      title:                [data?.title || '', [Validators.required, Validators.minLength(3)]],
      description:          [data?.description || '', Validators.required],
      type:                 [data?.type || 'technical', Validators.required],
      category:             [data?.category || 'college', Validators.required],
      venue:                [data?.venue || '', Validators.required],
      startDate:            [data?.startDate ? this.toDatetimeLocal(new Date(data.startDate)) : '', Validators.required],
      endDate:              [data?.endDate ? this.toDatetimeLocal(new Date(data.endDate)) : '', Validators.required],
      registrationDeadline: [data?.registrationDeadline ? this.toDatetimeLocal(new Date(data.registrationDeadline)) : '', Validators.required],
      maxParticipants:      [data?.maxParticipants || 50, [Validators.required, Validators.min(1)]],
      registrationFee:      [data?.registrationFee ?? 0, Validators.min(0)],
      organizer:            [data?.organizer || this.authService.getFullName() || '', Validators.required],
      contactEmail:         [data?.contactEmail || this.authService.getEmail() || '', [Validators.required, Validators.email]],
      availableSlots:       [data?.availableSlots?.join(', ') || ''] // Added slot input support
    });
  }
  private toDatetimeLocal(d: Date): string { return d.toISOString().slice(0, 16); }

  setView(v: 'overview' | 'events' | 'reports') { this.currentView.set(v); }
  logout() { this.authService.logout(); this.router.navigate(['/login']); }

  // ── LOAD & FILTER ──────────────────────────────────────────────────────────
  loadEvents() {
    const filters: any = {};
    if (this.startDateFilter)               filters.startDate = this.startDateFilter;
    if (this.endDateFilter)                 filters.endDate   = this.endDateFilter;
    if (this.eventStatusFilter   !== 'all') filters.status    = this.eventStatusFilter;
    if (this.eventTypeFilter     !== 'all') filters.type      = this.eventTypeFilter;
    if (this.eventCategoryFilter !== 'all') filters.category  = this.eventCategoryFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (evts: any[]) => {
        this.events = evts as ApiEvent[];
        this.applyLocalFilters();
        this.calcStats();
      },
      error: () => { this.events = []; this.filteredEvents = []; }
    });
  }

  applyLocalFilters() {
    const term = this.eventSearchTerm.toLowerCase().trim();
    this.filteredEvents = this.events.filter(e =>
      !term || e.title?.toLowerCase().includes(term) ||
               e.venue?.toLowerCase().includes(term) ||
               e.organizer?.toLowerCase().includes(term)
    );
  }

  onSearch()       { this.applyLocalFilters(); }
  onFilterChange() { this.loadEvents(); }

  clearFilters() {
    this.eventSearchTerm = ''; this.eventStatusFilter = 'all';
    this.eventTypeFilter = 'all'; this.eventCategoryFilter = 'all';
    this.startDateFilter = ''; this.endDateFilter = '';
    this.loadEvents();
  }

  calcStats() {
    this.totalEvents        = this.events.length;
    this.activeEvents       = this.events.filter(e => e.status === 'upcoming' || e.status === 'ongoing').length;
    this.totalRegistrations = this.events.reduce((s, e) => s + (e.currentParticipants || 0), 0);
    this.avgParticipants    = this.totalEvents > 0 ? Math.round(this.totalRegistrations / this.totalEvents) : 0;
  }

  // ── IMAGE UPLOAD ──────────────────────────────────────────────────────────
  onImageSelected(event: any) {
    const file: File = event.target.files[0];
    if (!file) return;
    const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowed.includes(file.type)) { this.formError = 'Only JPEG, PNG, GIF or WebP images are allowed.'; return; }
    if (file.size > 5 * 1024 * 1024) { this.formError = 'Image must be smaller than 5 MB.'; return; }
    this.selectedImageFile = file; this.formError = '';
    const reader = new FileReader();
    reader.onload = (e: any) => { this.imagePreviewUrl = e.target.result; };
    reader.readAsDataURL(file);
  }

  clearImage() { this.selectedImageFile = null; this.imagePreviewUrl = ''; }

  private buildPayload(): FormData | any {
    const v = this.eventForm.value;
    const fields: Record<string, string | string[]> = {
      title: v.title, description: v.description, type: v.type,
      category: v.category, venue: v.venue,
      startDate:            new Date(v.startDate).toISOString(),
      endDate:              new Date(v.endDate).toISOString(),
      registrationDeadline: new Date(v.registrationDeadline).toISOString(),
      maxParticipants:      String(Number(v.maxParticipants)),
      registrationFee:      String(Number(v.registrationFee) || 0),
      organizer:            v.organizer,
      contactEmail:         v.contactEmail
    };
    if (v.availableSlots) {
      fields['availableSlots'] = v.availableSlots.split(',').map((s: string) => s.trim()).filter(Boolean);
    }

    if (this.selectedImageFile) {
      const fd = new FormData();
      Object.entries(fields).forEach(([k, val]) => {
        if (Array.isArray(val)) {
          val.forEach(item => fd.append(k, item));
        } else {
          fd.append(k, val);
        }
      });
      fd.append('image', this.selectedImageFile);
      return fd;
    }
    return fields;
  }

  // ── CREATE ────────────────────────────────────────────────────────────────
  openCreate()  { this.eventForm = this.buildForm(); this.formError = ''; this.clearImage(); this.showCreateModal = true; }
  closeCreate() { this.showCreateModal = false; this.clearImage(); }

  submitCreate() {
    if (this.eventForm.invalid) { this.eventForm.markAllAsTouched(); return; }
    this.isSubmitting = true; this.formError = '';
    this.eventService.createEvent(this.buildPayload()).subscribe({
      next:     () => { this.showCreateModal = false; this.clearImage(); this.loadEvents(); },
      error:    err => { this.formError = err.error?.message || 'Failed to create event'; this.isSubmitting = false; },
      complete: () => this.isSubmitting = false
    });
  }

  // ── EDIT ──────────────────────────────────────────────────────────────────
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
    // Reset form to default values for next open
    this.eventForm.reset({
      title: '', description: '', venue: '', organizer: this.authService.getFullName() || '',
      type: 'technical', category: 'college', maxParticipants: 50, registrationFee: 0,
      contactEmail: this.authService.getEmail() || '', availableSlots: ''
    });
  }

  submitEdit() {
    if (!this.selectedEvent || this.eventForm.invalid) { this.eventForm.markAllAsTouched(); return; }
    this.isSubmitting = true; this.formError = '';
    this.eventService.updateEvent(this.selectedEvent._id, this.buildPayload()).subscribe({
      next:     () => { this.showEditModal = false; this.clearImage(); this.loadEvents(); },
      error:    err => { this.formError = err.error?.message || 'Failed to update event'; this.isSubmitting = false; },
      complete: () => this.isSubmitting = false
    });
  }

  // ── CANCEL / DELETE ───────────────────────────────────────────────────────
  cancelEvent(event: ApiEvent) {
    if (!confirm(`Cancel "${event.title}"?`)) return;
    this.eventService.updateEvent(event._id, { status: 'cancelled' }).subscribe({
      next: () => this.loadEvents(), error: err => alert(err.error?.message || 'Cannot cancel')
    });
  }
  deleteEvent(event: ApiEvent) {
    if (!confirm(`Permanently delete "${event.title}"? This cannot be undone.`)) return;
    this.eventService.deleteEvent(event._id).subscribe({
      next: () => this.loadEvents(), error: err => alert(err.error?.message || 'Cannot delete')
    });
  }

  // ── FEEDBACK MODAL ────────────────────────────────────────────────────────
  openFeedback(event: ApiEvent) {
    this.selectedEventName = event.title; this.selectedEventFeedback = event.feedback || [];
    this.averageRating = this.selectedEventFeedback.length
      ? this.selectedEventFeedback.reduce((s, f) => s + f.rating, 0) / this.selectedEventFeedback.length : 0;
    this.showFeedbackModal = true;
  }
  closeFeedback() { this.showFeedbackModal = false; }

  // ── PARTICIPANTS MODAL ────────────────────────────────────────────────────
  openParticipants(event: ApiEvent) {
    this.selectedEventName = event.title; this.participants = []; this.loadingParticipants = true;
    this.showParticipantsModal = true;
    this.statusMessage = null; // Reset message on open
    this.selectedRegistrations.clear(); // Reset selections
    this.eventService.getEventRegistrations(event._id).subscribe({
      next:  (data: any) => { this.participants = data.registrations || []; this.loadingParticipants = false; },
      error: ()          => { this.participants = [];                        this.loadingParticipants = false; }
    });
  }
  closeParticipants() { this.showParticipantsModal = false; this.statusMessage = null; this.selectedRegistrations.clear(); }

  updateStatus(registrationId: string, newStatus: string) {
    this.eventService.updateRegistrationStatus(registrationId, newStatus).subscribe({
      next: (response: any) => {
        this.statusMessage = { text: `Registration ${newStatus} successfully`, type: 'success' };
        
        const index = this.participants.findIndex(r => r._id === registrationId);
        if (index !== -1) {
          this.participants[index].status = newStatus;
        }

        // Auto-hide the message after 3 seconds
        setTimeout(() => { if (this.statusMessage?.type === 'success') this.statusMessage = null; }, 3000);
      },
      error: (err) => {
        console.error('Error updating status', err);
        this.statusMessage = { text: err.error?.message || 'Failed to update registration status.', type: 'error' };
        setTimeout(() => { if (this.statusMessage?.type === 'error') this.statusMessage = null; }, 3000);
      }
    });
  }

  // ─── BULK ACTIONS ──────────────────────────────────────────────────────────
  toggleRegistrationSelection(id: string, e: any) {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (isChecked) this.selectedRegistrations.add(id);
    else this.selectedRegistrations.delete(id);
  }

  toggleAllRegistrations(e: any) {
    const isChecked = (e.target as HTMLInputElement).checked;
    if (isChecked) {
      // Only select pending registrations for bulk actions to make sense
      this.participants.filter(p => p.status === 'pending').forEach(p => this.selectedRegistrations.add(p._id));
    } else {
      this.selectedRegistrations.clear();
    }
  }

  isAllSelected(): boolean {
    const pendingCount = this.participants.filter(p => p.status === 'pending').length;
    return pendingCount > 0 && this.selectedRegistrations.size === pendingCount;
  }

  bulkUpdateStatus(newStatus: string) {
    if (this.selectedRegistrations.size === 0) return;
    
    const ids = Array.from(this.selectedRegistrations);
    this.eventService.bulkUpdateRegistrationStatus(ids, newStatus).subscribe({
      next: (res: any) => {
        this.statusMessage = { text: `Successfully ${newStatus} ${res.updatedCount} registrations.`, type: 'success' };
        
        // Update local table UI
        ids.forEach(id => {
          const index = this.participants.findIndex(p => p._id === id);
          if (index !== -1) this.participants[index].status = newStatus;
        });

        this.selectedRegistrations.clear(); // remove checkboxes
        setTimeout(() => { if (this.statusMessage?.type === 'success') this.statusMessage = null; }, 3000);
      },
      error: (err) => {
        this.statusMessage = { text: err.error?.message || 'Failed to update registrations.', type: 'error' };
        setTimeout(() => { if (this.statusMessage?.type === 'error') this.statusMessage = null; }, 3000);
      }
    });
  }

  // ── CSV EXPORTS ───────────────────────────────────────────────────────────
  exportCSV() {
    const rows = [
      ['Title', 'Type', 'Category', 'Venue', 'Start Date', 'Registrations', 'Capacity', 'Fee (INR)', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`, e.type, e.category, `"${e.venue}"`,
        this.formatDate(e.startDate), e.currentParticipants,
        e.maxParticipants, e.registrationFee > 0 ? e.registrationFee : 'Free', e.status
      ])
    ];
    this.downloadCSV(rows, 'events-export');
  }

  exportRegistrationsCSV() {
    const rows = [
      ['Event', 'Type', 'Total Registrations', 'Capacity', 'Fill Rate (%)', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`, e.type, e.currentParticipants, e.maxParticipants,
        e.maxParticipants > 0 ? Math.round((e.currentParticipants / e.maxParticipants) * 100) : 0, e.status
      ])
    ];
    this.downloadCSV(rows, 'registrations-summary');
  }

  private downloadCSV(rows: any[][], filename: string) {
    const csv  = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── HELPERS ───────────────────────────────────────────────────────────────
  getStatusClass(s: string) {
    return { 'badge-upcoming': s==='upcoming', 'badge-ongoing': s==='ongoing',
             'badge-completed': s==='completed', 'badge-cancelled': s==='cancelled' };
  }
  formatDate(d: any): string {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
  getStars(r: number): string { return '★'.repeat(Math.round(r)) + '☆'.repeat(5 - Math.round(r)); }
  getDefaultImage(): string { return DEFAULT_IMAGE; }
  getF(name: string)               { return this.eventForm.get(name); }
  hasErr(name: string, err: string){ const c = this.getF(name); return c?.hasError(err) && c.touched; }
}