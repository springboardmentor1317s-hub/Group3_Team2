import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit, OnDestroy {

  currentView = signal<string>('overview');
  activeTab   = signal<string>('details');

  events: any[]           = [];
  filteredEvents: any[]   = [];
  registeredEventIds      = new Set<string>();
  registeredEvents: any[] = [];
  payments: any[]         = [];
  leaderboard: any[]      = [];

  selectedEvent: any  = null;
  selectedSlot        = '';
  showEventModal      = false;
  registering         = false;
  errorMessage        = '';

  searchQuery    = '';
  categoryFilter = 'all';
  statusFilter   = 'all';

  user: any           = null;
  walletBalance       = 0;
  sidebarCollapsed    = false;
  mobileSidebarOpen   = false;
  totalPoints         = 0;
  myRank              = 0;
  showConfetti        = false;

  // Payment modal
  showPaymentModal      = false;
  processingPayment     = false;
  paymentSuccess        = false;
  selectedPaymentMethod = 'wallet';
  pendingPaymentEvent: any = null;
  showTopUpModal        = false;
  topUpAmount           = 200;
  topUpLoading          = false;
  topUpSuccess          = false;

  // Feedback
  showFeedbackModal     = false;
  feedbackEvent: any    = null;
  feedbackRating        = 0;
  feedbackComment       = '';
  feedbackSubmitting    = false;
  feedbackError         = '';

  showProfileModal = false;
  private navSub!: Subscription | undefined;

  constructor(
    public authService: AuthService,
    private eventService: EventService,
    private router: Router,
    private chatService: ChatService,
    public notifService: NotificationService
  ) {
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;
      if (req === 'BROWSE_EVENTS')  this.setView('events');
      if (req === 'LEADERBOARD')    this.setView('leaderboard');
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('student')) {
      this.authService.logout(); this.router.navigate(['/login']); return;
    }
    this.user = this.authService.getUser() || {};
    this.walletBalance = this.authService.getWallet();
    this.loadEvents();
    this.loadMyRegistrations();
    this.loadLeaderboard();
    this.notifService.reload();
    // Sync wallet from server
    this.authService.getWalletBalance().subscribe({
      next: (r: any) => { this.walletBalance = r.walletBalance; this.authService.updateWalletBalance(r.walletBalance); }
    });
  }

  ngOnDestroy() { this.navSub?.unsubscribe(); }

  // ─── UI ─────────────────────────────────────────────────────────────────────
  setView(v: string)    { this.currentView.set(v); }
  setTab(t: string)     { this.activeTab.set(t); }
  toggleSidebar()       { this.sidebarCollapsed  = !this.sidebarCollapsed; }
  toggleMobileSidebar() { this.mobileSidebarOpen = !this.mobileSidebarOpen; }
  closeMobileSidebar()  { this.mobileSidebarOpen = false; }

  getInitial():  string { return this.getFullName()?.charAt(0)?.toUpperCase() || 'U'; }
  getFullName(): string { return this.user?.fullName || 'Student'; }
  getEmail():    string { return this.user?.email    || ''; }
  getCollege():  string { return this.user?.college  || '—'; }

  // ─── EVENTS ─────────────────────────────────────────────────────────────────
  loadEvents() {
    this.eventService.getAllEvents().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : data?.events || [];
        this.events = list.map((e: any) => ({ ...e, status: this.eventService.computeStatus(e) }));
        this.filterEvents();
      },
      error: () => { this.events = []; this.filteredEvents = []; }
    });
  }

  loadMyRegistrations() {
    this.eventService.getMyRegistrations().subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : [];
        this.registeredEvents   = list.map((e: any) => ({ ...e, status: this.eventService.computeStatus(e) }));
        this.registeredEventIds = new Set(list.map((e: any) => String(e?._id || e?.id)));
        this.payments = list.filter((e: any) => (e.paymentAmount || 0) > 0).map((e: any) => ({
          id:     e.paymentTxnId  || ('TXN-' + e.registrationId),
          event:  e.title,
          amount: e.paymentAmount,
          status: e.paymentStatus === 'paid' ? 'success' : e.paymentStatus,
          method: e.paymentMethod || '—',
          date:   e.registeredAt  || e.createdAt
        }));
      },
      error: () => { this.registeredEvents = []; this.registeredEventIds = new Set(); }
    });
  }

  loadLeaderboard() {
    this.leaderboard = [
      { rank:1, name:'Arjun Kumar',  college:'IIT Madras',  events:12, points:2400, badges:['🏆','🎯','⚡'] },
      { rank:2, name:'Priya Sharma', college:'NIT Trichy',  events:10, points:2100, badges:['🥈','🎨'] },
      { rank:3, name:'Vikram Nair',  college:'BITS Pilani', events:9,  points:1950, badges:['🥉','💡'] },
      { rank:4, name:'Meera Patel',  college:'VIT Vellore', events:8,  points:1800, badges:['🎯'] },
      { rank:5, name:'Rahul Singh',  college:'SRM Chennai', events:7,  points:1600, badges:['⚡'] },
    ];
    this.totalPoints = this.registeredEvents.length * 200;
    this.myRank = 6;
  }

  // ─── FILTER ─────────────────────────────────────────────────────────────────
  filterEvents() {
    let list = [...this.events];
    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter(e => e.title?.toLowerCase().includes(q) || e.description?.toLowerCase().includes(q) || e.venue?.toLowerCase().includes(q));
    }
    if (this.categoryFilter !== 'all') list = list.filter(e => e.category === this.categoryFilter);
    if (this.statusFilter   !== 'all') list = list.filter(e => e.status   === this.statusFilter);
    this.filteredEvents = list;
  }
  onSearchChange() { this.filterEvents(); }
  onFilterChange() { this.filterEvents(); }
  clearFilters()   { this.searchQuery = ''; this.categoryFilter = 'all'; this.statusFilter = 'all'; this.filterEvents(); }

  // ─── HELPERS ────────────────────────────────────────────────────────────────
  isRegistered(ev: any):   boolean { return this.registeredEventIds.has(String(ev._id || ev.id)); }
  isFull(ev: any):         boolean { return (ev.currentParticipants || 0) >= (ev.maxParticipants || 0); }
  getSpotsLeft(ev: any):   number  { return Math.max((ev.maxParticipants || 0) - (ev.currentParticipants || 0), 0); }
  isSpotsUrgent(ev: any):  boolean { return this.getSpotsLeft(ev) <= 5 && this.getSpotsLeft(ev) > 0; }

  getMyRegistration(eventId: string): any {
    return this.registeredEvents.find(r => String(r._id || r.id) === String(eventId)) || null;
  }

  canGiveFeedback(ev: any): boolean {
    return ev.status === 'completed' && this.isRegistered(ev) &&
           (this.getMyRegistration(ev._id)?.approvalStatus === 'approved') &&
           !(this.getMyRegistration(ev._id)?.hasFeedback);
  }

  getPastEventsWithFeedback(): any[] {
    return this.registeredEvents.filter(e => e.status === 'completed');
  }

  getAllTestimonials(): any[] {
    const all: any[] = [];
    this.events.forEach(ev => {
      if (ev.feedback?.length) ev.feedback.forEach((f: any) => all.push({ ...f, eventTitle: ev.title }));
    });
    return all.slice(0, 6);
  }

  getDashboardStats() {
    const r = this.registeredEvents;
    return {
      registered: r.length,
      upcoming:   r.filter(e => e.status === 'upcoming').length,
      completed:  r.filter(e => e.status === 'completed').length,
      pending:    r.filter(e => e.approvalStatus === 'pending').length,
      approved:   r.filter(e => e.approvalStatus === 'approved').length,
      rejected:   r.filter(e => e.approvalStatus === 'rejected').length
    };
  }

  getTrendingEvents()   { return this.events.filter(e => e.status !== 'completed').slice(0, 4); }
  getUpcomingSchedule() {
    return this.registeredEvents
      .filter(e => e.status === 'upcoming' && e.approvalStatus === 'approved')
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  formatDate(d: any):     string { if (!d) return ''; return new Date(d).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' }); }
  formatDateTime(d: any): string { if (!d) return ''; return new Date(d).toLocaleString('en-IN'); }
  getStars(r: number):    string { return '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0)); }

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────────
  get notifications() { return this.notifService.notifications(); }
  get unreadCount()   { return this.notifService.unreadCount; }
  markNotificationRead(n: any) { this.notifService.markRead(n._id); }
  markAllRead()               { this.notifService.markAllRead(); }
  deleteNotification(n: any)  { this.notifService.delete(n._id); }
  getNotifIcon(type: string): string {
    const m: any = { 'registration-approved':'✅','registration-rejected':'❌','new-registration':'📋','event-update':'📢','general':'🔔' };
    return m[type] || '🔔';
  }

  // ─── REGISTRATION FLOW ──────────────────────────────────────────────────────
  openEventModal(event: any)  {
    this.selectedEvent = event; this.showEventModal = true;
    this.setTab('details'); this.errorMessage = ''; this.selectedSlot = '';
  }
  closeEventModal() { this.showEventModal = false; this.selectedEvent = null; }

  startRegistration() {
    if (!this.selectedEvent) return;
    if (this.selectedEvent.slots?.length > 0 && !this.selectedSlot) {
      this.errorMessage = 'Please select a time slot first.'; return;
    }
    if ((this.selectedEvent.registrationFee || 0) > 0) {
      this.pendingPaymentEvent    = this.selectedEvent;
      this.showPaymentModal       = true;
      this.paymentSuccess         = false;
      this.processingPayment      = false;
      this.selectedPaymentMethod  = this.walletBalance >= this.selectedEvent.registrationFee ? 'wallet' : 'upi';
      return;
    }
    this.doRegister();
  }

  doRegister(paymentPayload?: { paymentMethod: string; paymentTxnId?: string; paymentAmount: number; useWallet?: boolean }) {
    if (!this.selectedEvent) return;
    const id = this.selectedEvent._id || this.selectedEvent.id;
    this.registering = true; this.errorMessage = '';
    const payload: any = { selectedSlot: this.selectedSlot };
    if (paymentPayload) Object.assign(payload, paymentPayload);

    this.eventService.registerForEvent(id, payload).subscribe({
      next: (res: any) => {
        this.registering = false;
        this.registeredEventIds.add(String(id));
        if (res?.walletBalance !== undefined) {
          this.walletBalance = res.walletBalance;
          this.authService.updateWalletBalance(res.walletBalance);
        }
        this.selectedSlot = '';
        this.loadMyRegistrations();
        this.closeEventModal();
        this.showConfetti = true;
        setTimeout(() => this.showConfetti = false, 3000);
        this.notifService.reload();
      },
      error: (err: any) => { this.errorMessage = err?.error?.message || 'Registration failed.'; this.registering = false; }
    });
  }

  cancelRegistration(ev: any) {
    if (!confirm('Cancel your registration for "' + ev.title + '"?')) return;
    const id = ev._id || ev.id;
    this.eventService.unregisterFromEvent(id).subscribe({
      next: () => {
        this.registeredEventIds.delete(String(id));
        this.loadMyRegistrations(); this.loadEvents();
        // Refresh wallet (might have been refunded)
        this.authService.getWalletBalance().subscribe({ next: (r: any) => { this.walletBalance = r.walletBalance; this.authService.updateWalletBalance(r.walletBalance); } });
      },
      error: (err: any) => alert(err?.error?.message || 'Could not cancel.')
    });
  }

  cancelFromModal() { if (this.selectedEvent) { this.cancelRegistration(this.selectedEvent); this.closeEventModal(); } }

  // ─── PAYMENT MODAL ──────────────────────────────────────────────────────────
  closePaymentModal() { this.showPaymentModal = false; this.pendingPaymentEvent = null; }

  processPayment() {
    if (!this.pendingPaymentEvent) return;
    this.processingPayment = true;

    if (this.selectedPaymentMethod === 'wallet') {
      if (this.walletBalance < this.pendingPaymentEvent.registrationFee) {
        this.processingPayment = false;
        alert('Insufficient wallet balance. Please top up or choose another method.');
        return;
      }
      // Wallet payment: register directly with useWallet flag
      this.processingPayment = false;
      this.paymentSuccess = true;
      setTimeout(() => {
        this.showPaymentModal = false;
        this.doRegister({ paymentMethod: 'wallet', paymentAmount: this.pendingPaymentEvent.registrationFee, useWallet: true });
      }, 1000);
    } else {
      // Simulate other payment gateway (2 sec delay)
      setTimeout(() => {
        this.processingPayment = false;
        this.paymentSuccess    = true;
        const txnId  = 'TXN' + Date.now();
        const amount = this.pendingPaymentEvent.registrationFee;
        setTimeout(() => {
          this.showPaymentModal = false;
          this.doRegister({ paymentMethod: this.selectedPaymentMethod, paymentTxnId: txnId, paymentAmount: amount });
        }, 1000);
      }, 2000);
    }
  }

  // ─── TOP UP WALLET ──────────────────────────────────────────────────────────
  openTopUp()   { this.showTopUpModal = true; this.topUpAmount = 200; this.topUpSuccess = false; }
  closeTopUp()  { this.showTopUpModal = false; }

  submitTopUp() {
    if (!this.topUpAmount || this.topUpAmount < 1) return;
    this.topUpLoading = true;
    this.authService.topUpWallet(this.topUpAmount).subscribe({
      next: (r: any) => {
        this.walletBalance = r.walletBalance;
        this.authService.updateWalletBalance(r.walletBalance);
        this.topUpLoading = false; this.topUpSuccess = true;
        setTimeout(() => { this.showTopUpModal = false; this.topUpSuccess = false; }, 1500);
      },
      error: () => { this.topUpLoading = false; }
    });
  }

  // ─── FEEDBACK ───────────────────────────────────────────────────────────────
  openFeedback(ev: any) {
    this.feedbackEvent    = ev;
    this.feedbackRating   = 0;
    this.feedbackComment  = '';
    this.feedbackError    = '';
    this.showFeedbackModal= true;
  }
  closeFeedback() { this.showFeedbackModal = false; this.feedbackEvent = null; }

  setFeedbackRating(r: number) { this.feedbackRating = r; }

  submitFeedback() {
    if (!this.feedbackRating) { this.feedbackError = 'Please select a star rating.'; return; }
    if (!this.feedbackEvent)   return;
    this.feedbackSubmitting = true; this.feedbackError = '';
    const eventId = this.feedbackEvent._id || this.feedbackEvent.id;
    this.eventService.submitFeedback(eventId, { rating: this.feedbackRating, comment: this.feedbackComment }).subscribe({
      next: () => {
        this.feedbackSubmitting = false;
        // Mark hasFeedback locally
        const reg = this.registeredEvents.find(r => String(r._id || r.id) === String(eventId));
        if (reg) reg.hasFeedback = true;
        this.closeFeedback();
        this.loadEvents(); // refresh to get updated feedback
      },
      error: (err: any) => { this.feedbackError = err?.error?.message || 'Failed to submit feedback.'; this.feedbackSubmitting = false; }
    });
  }

  // ─── PROFILE MODAL ──────────────────────────────────────────────────────────
  openProfileModal()  { this.showProfileModal = true; }
  closeProfileModal() { this.showProfileModal = false; }

  getRegistrationStatusClass(status: string) {
    return { 'status-pending': status==='pending', 'status-approved': status==='approved', 'status-rejected': status==='rejected' };
  }
  getStatusClass(s: string) {
    if (s === 'success' || s === 'paid') return 'badge-success';
    if (s === 'failed')                  return 'badge-danger';
    if (s === 'pending')                 return 'badge-warning';
    return 'badge-info';
  }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }
}
