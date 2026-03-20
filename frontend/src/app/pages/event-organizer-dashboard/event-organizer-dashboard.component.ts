import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, FormsModule, ReactiveFormsModule } from '@angular/forms';
import { Router } from '@angular/router';
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
  feedback?: { userId: any; rating: number; comment?: string; createdAt: Date; }[];
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
}

const DEFAULT_IMAGE = 'https://images.unsplash.com/photo-1501281668745-f7f57925c3b4?w=800&q=80';

@Component({
  selector: 'app-event-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-organizer-dashboard.component.html',
  styleUrls: ['./event-organizer-dashboard.component.css']
})
export class EventOrganizerDashboardComponent implements OnInit {
  currentView = signal<'overview' | 'events' | 'reports' | 'notifications' | 'analytics' | 'settings'>('overview');

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

  // Modals
  showCreateModal = false;
  showEditModal = false;
  showFeedbackModal = false;
  showParticipantsModal = false;
  showRejectModal = false;
  showProfileModal = false;
  showNotifDropdown = false;

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

  typeOptions = ['technical', 'cultural', 'sports', 'workshop', 'seminar'];
  categoryOptions = ['college', 'inter-college'];

  // ✅ NEW PROPERTIES
  notificationFilter: string = 'all';
  filteredNotifications: any[] = [];
  pendingApprovals: number = 0;
  notificationList: any[] = []; // Local copy for notifications

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
      this.router.navigate(['/login']);
      return;
    }
    this.loadEvents();
    this.notifService.reload();
    this.loadNotifications();
  }

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
  console.log('📸 File selected:', file?.name);
  
  if (!file) {
    console.log('❌ No file');
    return;
  }
  
  const allowed = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowed.includes(file.type)) {
    this.formError = 'Only JPEG, PNG, GIF or WebP.';
    console.log('❌ Invalid type:', file.type);
    return;
  }
  
  if (file.size > 5 * 1024 * 1024) {
    this.formError = 'Image must be < 5 MB.';
    console.log('❌ Too large:', file.size);
    return;
  }
  
  this.selectedImageFile = file;
  this.formError = '';
  
  const reader = new FileReader();
  reader.onload = (e: any) => { 
    console.log('✅ Image loaded, preview created');
    this.imagePreviewUrl = e.target.result; 
  };
  reader.onerror = (err) => {
    console.log('❌ FileReader error:', err);
  };
  reader.readAsDataURL(file);
}

clearImage() {
  console.log('🗑️ Clearing image');
  this.selectedImageFile = null;
  this.imagePreviewUrl = '';
}

private buildPayload(): FormData | any {
  const v = this.eventForm.value;
  console.log('📝 Building payload, image present:', !!this.selectedImageFile);
  
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
  
  console.log('Fields prepared:', Object.keys(fields));
  
  if (this.selectedImageFile) {
    console.log('📸 Creating FormData with image:', this.selectedImageFile.name);
    const fd = new FormData();
    Object.entries(fields).forEach(([k, val]) => fd.append(k, val));
    fd.append('image', this.selectedImageFile);
    console.log('📤 FormData created with image');
    return fd;
  }
  
  console.log('📤 Sending JSON without image');
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

  // ── FEEDBACK ─────────────────────────────────────────────────────────────
  openFeedback(event: ApiEvent) {
    this.selectedEventName = event.title;
    this.selectedEventFeedback = event.feedback || [];
    this.averageRating = this.selectedEventFeedback.length
      ? this.selectedEventFeedback.reduce((s, f) => s + f.rating, 0) / this.selectedEventFeedback.length
      : 0;
    this.showFeedbackModal = true;
  }

  closeFeedback() {
    this.showFeedbackModal = false;
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
  // Get notifications from service
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
    // Get notifications from the service
    const notifications = this.notifService.notifications();
    
    // Store in local array
    this.notificationList = notifications;
    
    // Update counts
    this.pendingApprovals = notifications.filter(
      (n: any) => n.type === 'new-registration' && !n.read
    ).length;
    
    // Apply current filter
    this.filterNotifications(this.notificationFilter);
  }

  filterNotifications(filter: string) {
    this.notificationFilter = filter;
    
    // Get fresh notifications
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
    // Wait a bit for the service to update
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