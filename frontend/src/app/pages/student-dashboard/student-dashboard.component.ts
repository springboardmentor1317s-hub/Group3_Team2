import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
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

  events: any[] = [];
  filteredEvents: any[] = [];
  registeredEventIds = new Set<string>();
  pendingEventIds = new Set<string>();
  rejectedEventIds = new Set<string>();
  registeredEvents: any[] = [];
  pendingEvents: any[] = [];
  rejectedEvents: any[] = [];

  notifications: any[] = [];
  payments: any[] = [];
  leaderboard: any[] = [];

  selectedEvent: any = null;
  selectedSlot: string = '';

  showEventModal = false;
  registering = false;
  errorMessage = '';

  searchQuery = '';
  categoryFilter = 'all';
  dateFilter = '';
  statusFilter = 'all';

  user: any = null;
  walletBalance = 0;
  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  totalPoints = 0;
  myRank = 0;
  showConfetti = false;

  // Payment modal
  showPaymentModal = false;
  processingPayment = false;
  paymentSuccess = false;
  selectedPaymentMethod = 'wallet';
  pendingPaymentEvent: any = null;
  showTopUpModal = false;
  topUpAmount = 200;
  topUpLoading = false;
  topUpSuccess = false;

  cancelling = false;
  
  // Auto-refresh
  private refreshSubscription!: Subscription;
  private isActive = true;
  lastUpdateTime: Date = new Date();

  // Feedback
  showFeedbackModal = false;
  feedbackEvent: any = null;
  feedbackRating = 0;
  feedbackComment = '';
  feedbackSubmitting = false;
  feedbackError = '';

  showProfileModal = false;
  private navSub!: Subscription | undefined;

  showPassword = false;

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

      if (req === 'BROWSE_EVENTS') { this.setView('events'); }
      if (req === 'LEADERBOARD') { this.setView('leaderboard'); }

      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('student')) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    this.user = this.authService.getUser() || {};
    this.walletBalance = this.authService.getWallet ? this.authService.getWallet() : 0;
    
    this.loadEvents();
    this.loadMyRegistrations();
    this.loadLeaderboard();
    
    // Load notifications from service
    this.loadNotifications();
    
    // Sync wallet from server
    this.authService.getWalletBalance().subscribe({
      next: (r: any) => { 
        this.walletBalance = r.walletBalance; 
        this.authService.updateWalletBalance(r.walletBalance); 
      },
      error: (err) => {
        console.error('Failed to load wallet balance:', err);
      }
    });

    // Start auto-refresh every 10 seconds
    this.startAutoRefresh();
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
    this.stopAutoRefresh();
    this.isActive = false;
  }

  // ─── Auto-Refresh Methods ────────────────────────────────────────────

  startAutoRefresh() {
    // Refresh every 10 seconds to check for approval updates
    this.refreshSubscription = interval(10000).subscribe(() => {
      if (this.isActive && document.visibilityState === 'visible') {
        console.log('🔄 Auto-refreshing registrations...');
        this.loadMyRegistrations();
        this.lastUpdateTime = new Date();
      }
    });
  }

  stopAutoRefresh() {
    if (this.refreshSubscription) {
      this.refreshSubscription.unsubscribe();
    }
  }

  refreshData() {
    console.log('🔄 Manual refresh triggered');
    this.loadEvents();
    this.loadMyRegistrations();
    this.loadLeaderboard();
    this.notifService.reload();
    this.loadNotifications(); // Refresh notifications
    this.lastUpdateTime = new Date();
  }

  // ─── UI CONTROLS ────────────────────────────────────────────────────────────

  setView(view: string) { 
    this.currentView.set(view); 
    // Refresh when switching to views that need latest data
    if (view === 'registered' || view === 'schedule' || view === 'overview') {
      this.loadMyRegistrations();
    }
    if (view === 'events') {
      this.loadEvents();
    }
    if (view === 'payments') {
      this.loadMyRegistrations();
    }
    if (view === 'notifications') {
      this.loadNotifications();
    }
  }
  
  setTab(tab: string) { this.activeTab.set(tab); }

  toggleSidebar() { this.sidebarCollapsed = !this.sidebarCollapsed; }
  toggleMobileSidebar() { this.mobileSidebarOpen = !this.mobileSidebarOpen; }
  closeMobileSidebar() { this.mobileSidebarOpen = false; }

  // ─── USER HELPERS ───────────────────────────────────────────────────────────

  getInitial(): string {
    return this.getFullName()?.charAt(0)?.toUpperCase() || 'U';
  }

  getFullName(): string {
    return this.user?.fullName || 'Student User';
  }

  getEmail(): string {
    return this.user?.email || '';
  }

  getCollege(): string {
    return this.user?.college || '—';
  }

  // ─── EVENT DATA ─────────────────────────────────────────────────────────────

  loadEvents() {
    const filters: any = {};
    if (this.categoryFilter !== 'all') filters.category = this.categoryFilter;
    if (this.statusFilter !== 'all') filters.status = this.statusFilter;
    if (this.dateFilter) filters.date = this.dateFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (data: any) => {
        console.log('📡 All Events API Response:', data);
        const list = Array.isArray(data) ? data : data?.events || [];
        this.events = list.map((e: any) => ({ 
          ...e, 
          status: this.eventService.computeStatus ? this.eventService.computeStatus(e) : e.status 
        }));
        this.filterEvents();
      },
      error: (err: any) => {
        console.error('❌ Failed to load events:', err);
        this.events = [];
        this.filteredEvents = [];
      }
    });
  }

  loadMyRegistrations() {
    this.eventService.getMyRegistrations().subscribe({
      next: (data: any) => {
        console.log('📡 My Registrations API Response:', data);
        const list = Array.isArray(data) ? data : data?.events || [];
        
        // Store previous pending events to detect changes
        const prevPendingEvents = [...(this.pendingEvents || [])];
        
        // Split registrations based on approvalStatus from the backend
        const newRegisteredEvents = list.filter((ev: any) => 
          ev.approvalStatus === 'approved'
        );
        
        const newPendingEvents = list.filter((ev: any) => 
          ev.approvalStatus === 'pending'
        );

        const newRejectedEvents = list.filter((ev: any) => 
          ev.approvalStatus === 'rejected'
        );

        // Check for newly rejected events (were pending, now rejected)
        if (prevPendingEvents && prevPendingEvents.length > 0) {
          const newlyRejected = prevPendingEvents.filter(pending => {
            const pendingId = pending._id || pending.id;
            return !newPendingEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            }) && newRejectedEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            });
          });
          
          if (newlyRejected.length > 0) {
            console.log('❌ New rejections detected:', newlyRejected);
            
            newlyRejected.forEach((event: any) => {
              // Show alert for rejection
              alert(`❌ Your registration for "${event.title}" was rejected.`);
              
              // Add notification for rejection
              this.addNotification({
                id: Date.now() + Math.random(),
                icon: '❌',
                title: 'Registration Rejected',
                message: `Your registration for "${event.title}" was not approved.`,
                time: 'Just now',
                read: false,
                type: 'rejection',
                data: { eventId: event._id || event.id }
              });
            });
          }
        }

        // Check for newly approved events (were pending, now approved)
        if (prevPendingEvents && prevPendingEvents.length > 0) {
          const newlyApproved = prevPendingEvents.filter(pending => {
            const pendingId = pending._id || pending.id;
            return !newPendingEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            }) && newRegisteredEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            });
          });
          
          if (newlyApproved.length > 0) {
            console.log('✅ New approvals detected:', newlyApproved.length);
            
            // Show alert for first approval
            if (newlyApproved.length === 1) {
              alert(`✅ Your registration for "${newlyApproved[0].title}" has been approved!`);
            } else {
              alert(`✅ ${newlyApproved.length} of your registrations have been approved!`);
            }
            
            // Add notification for each approval
            newlyApproved.forEach((event: any) => {
              this.addNotification({
                id: Date.now() + Math.random(),
                icon: '✅',
                title: 'Registration Approved',
                message: `Your registration for "${event.title}" has been approved!`,
                time: 'Just now',
                read: false,
                type: 'approval',
                data: { eventId: event._id || event.id }
              });
            });
          }
        }
        
        // Update the arrays
        this.registeredEvents = newRegisteredEvents.map((e: any) => ({ 
          ...e, 
          status: this.eventService.computeStatus ? this.eventService.computeStatus(e) : e.status 
        }));
        
        this.pendingEvents = newPendingEvents.map((e: any) => ({ 
          ...e, 
          status: this.eventService.computeStatus ? this.eventService.computeStatus(e) : e.status 
        }));

        this.rejectedEvents = newRejectedEvents.map((e: any) => ({ 
          ...e, 
          status: this.eventService.computeStatus ? this.eventService.computeStatus(e) : e.status 
        }));

        // Update ID sets
        this.registeredEventIds = new Set(
          this.registeredEvents.map((ev: any) => String(ev?._id || ev?.id))
        );
        
        this.pendingEventIds = new Set(
          this.pendingEvents.map((ev: any) => String(ev?._id || ev?.id))
        );

        this.rejectedEventIds = new Set(
          this.rejectedEvents.map((ev: any) => String(ev?._id || ev?.id))
        );

        // Update payments list
        this.payments = list.filter((e: any) => (e.paymentAmount || 0) > 0).map((e: any) => ({
          id: e.paymentTxnId || ('TXN-' + e.registrationId),
          event: e.title,
          amount: e.paymentAmount,
          status: e.paymentStatus === 'paid' ? 'success' : e.paymentStatus,
          method: e.paymentMethod || '—',
          date: e.registeredAt || e.createdAt
        }));

        console.log('✅ Approved Events:', Array.from(this.registeredEventIds));
        console.log('⏳ Pending Events:', Array.from(this.pendingEventIds));
        console.log('❌ Rejected Events:', Array.from(this.rejectedEventIds));
        
        // Calculate points
        this.calculateTotalPoints();
      },
      error: (err: any) => {
        console.error('❌ Failed to load registrations:', err);
        this.registeredEvents = [];
        this.pendingEvents = [];
        this.rejectedEvents = [];
        this.registeredEventIds = new Set();
        this.pendingEventIds = new Set();
        this.rejectedEventIds = new Set();
      }
    });
  }

  // Load notifications from service
  loadNotifications() {
    // Get notifications from the service
    this.notifications = this.notifService.notifications();
    console.log('📬 Notifications loaded:', this.notifications.length);
  }

  loadLeaderboard() {
    // Mock leaderboard data - in production, this would come from an API
    this.leaderboard = [
      { rank: 1, name: 'Arjun Kumar', college: 'IIT Madras', events: 12, points: 2400, badges: ['🏆', '🎯', '⚡'] },
      { rank: 2, name: 'Priya Sharma', college: 'NIT Trichy', events: 10, points: 2100, badges: ['🥈', '🎨'] },
      { rank: 3, name: 'Vikram Nair', college: 'BITS Pilani', events: 9, points: 1950, badges: ['🥉', '💡'] },
      { rank: 4, name: 'Meera Patel', college: 'VIT Vellore', events: 8, points: 1800, badges: ['🎯'] },
      { rank: 5, name: 'Rahul Singh', college: 'SRM Chennai', events: 7, points: 1600, badges: ['⚡'] },
      { rank: 6, name: this.getFullName(), college: this.getCollege(), events: this.registeredEvents.length, points: this.totalPoints, badges: [] }
    ];
    
    // Find my rank
    const myEntry = this.leaderboard.find(l => l.name === this.getFullName());
    this.myRank = myEntry ? myEntry.rank : 6;
  }

  calculateTotalPoints() {
    this.totalPoints = this.registeredEvents.length * 200;
  }

  addNotification(notification: any) {
    this.notifications.unshift(notification);
    if (this.notifications.length > 50) {
      this.notifications.pop();
    }
  }

  // ─── FILTERING ──────────────────────────────────────────────────────────────

  filterEvents() {
    let list = [...this.events];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q) ||
        e.venue?.toLowerCase().includes(q)
      );
    }

    if (this.categoryFilter !== 'all') list = list.filter((e: any) => e.category === this.categoryFilter);
    if (this.statusFilter !== 'all') list = list.filter((e: any) => e.status === this.statusFilter);

    this.filteredEvents = list;
  }

  onSearchChange() { this.filterEvents(); }
  onFilterChange() { this.filterEvents(); }
  
  clearFilters() { 
    this.searchQuery = ''; 
    this.categoryFilter = 'all'; 
    this.statusFilter = 'all'; 
    this.filterEvents(); 
  }

  // ─── EVENT UTILITIES ────────────────────────────────────────────────────────

  isRegistered(ev: any): boolean {
    return this.registeredEventIds.has(String(ev._id || ev.id));
  }

  isPendingApproval(ev: any): boolean {
    return this.pendingEventIds.has(String(ev._id || ev.id));
  }

  isRejected(ev: any): boolean {
    return this.rejectedEventIds.has(String(ev._id || ev.id));
  }

  isFull(ev: any): boolean {
    if (!ev.maxParticipants) return false;
    return (ev.currentParticipants || 0) >= ev.maxParticipants;
  }

  getSpotsLeft(ev: any): number {
    return Math.max((ev.maxParticipants || 0) - (ev.currentParticipants || 0), 0);
  }

  isSpotsUrgent(ev: any): boolean {
    return this.getSpotsLeft(ev) <= 5 && this.getSpotsLeft(ev) > 0;
  }

  getMyRegistration(eventId: string): any {
    return this.registeredEvents.find(r => String(r._id || r.id) === String(eventId)) || 
           this.pendingEvents.find(r => String(r._id || r.id) === String(eventId)) ||
           this.rejectedEvents.find(r => String(r._id || r.id) === String(eventId)) || null;
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
    return {
      registered: this.registeredEvents.length,
      upcoming: this.registeredEvents.filter(e => e.status === 'upcoming').length,
      completed: this.registeredEvents.filter(e => e.status === 'completed').length,
      pending: this.pendingEvents?.length || 0,
      rejected: this.rejectedEvents?.length || 0,
      approved: this.registeredEvents.filter(e => e.approvalStatus === 'approved').length,
      total: this.registeredEvents.length + this.pendingEvents.length + this.rejectedEvents.length
    };
  }

  getTrendingEvents() { 
    return this.events.filter(e => e.status !== 'completed').slice(0, 4); 
  }

  getUpcomingSchedule() {
    // Combine both approved and pending registrations that are upcoming
    const allUpcoming = [
      ...this.registeredEvents.filter((e: any) => e.status === 'upcoming'),
      ...this.pendingEvents.filter((e: any) => e.status === 'upcoming')
    ];
    
    return allUpcoming.sort((a: any, b: any) => 
      new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
    );
  }

  // ─── DATE FORMATTERS ────────────────────────────────────────────────────────

  formatDate(d: any): string { 
    if (!d) return ''; 
    return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }); 
  }
  
  formatDateTime(d: any): string { 
    if (!d) return ''; 
    return new Date(d).toLocaleString('en-IN'); 
  }
  
  getStars(r: number): string { 
    return '★'.repeat(Math.round(r || 0)) + '☆'.repeat(5 - Math.round(r || 0)); 
  }

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

  get unreadCount() { 
    return this.notifService.unreadCount; 
  }
  
  markNotificationRead(n: any) { 
    this.notifService.markRead(n._id);
    n.read = true;
    
    // If it's a rejection or approval notification, navigate appropriately
    if (n.type === 'rejection' && n.data?.eventId) {
      const event = this.events.find(e => (e._id || e.id) === n.data.eventId);
      if (event) {
        this.openEventModal(event);
      }
    } else if (n.type === 'approval' && n.data?.eventId) {
      this.setView('registered'); // Go to My Events to see approved event
    }
  }
  
  markAllRead() { 
    this.notifService.markAllRead(); 
    this.loadNotifications(); // Refresh notifications after marking all read
  }
  
  deleteNotification(n: any) { 
    this.notifService.delete(n._id); 
    this.loadNotifications(); // Refresh after deletion
  }
  
  getNotifIcon(type: string): string {
    const icons: any = { 
      'registration-approved': '✅',
      'registration-rejected': '❌',
      'new-registration': '📋',
      'event-update': '📢',
      'general': '🔔',
      'approval': '✅',
      'rejection': '❌',
      'pending': '⏳'
    };
    return icons[type] || '🔔';
  }

  // ─── REGISTRATION FLOW ──────────────────────────────────────────────────────

  openEventModal(event: any) {
    this.selectedEvent = event;
    this.showEventModal = true;
    this.setTab('details');
    this.errorMessage = '';
    this.selectedSlot = '';
  }

  closeEventModal() {
    this.showEventModal = false;
    this.selectedEvent = null;
  }

  startRegistration() {
    if (!this.selectedEvent) return;
    
    // Check if already rejected
    if (this.isRejected(this.selectedEvent)) {
      alert('Your previous registration for this event was rejected. You can try registering again.');
      // Proceed with registration anyway
    }
    
    if (this.selectedEvent.slots?.length > 0 && !this.selectedSlot) {
      this.errorMessage = 'Please select a time slot first.';
      return;
    }
    
    if ((this.selectedEvent.registrationFee || 0) > 0) {
      this.pendingPaymentEvent = this.selectedEvent;
      this.showPaymentModal = true;
      this.paymentSuccess = false;
      this.processingPayment = false;
      this.selectedPaymentMethod = this.walletBalance >= this.selectedEvent.registrationFee ? 'wallet' : 'upi';
      return;
    }
    
    this.doRegister();
  }

  doRegister(paymentPayload?: { paymentMethod: string; paymentTxnId?: string; paymentAmount: number; useWallet?: boolean }) {
    if (!this.selectedEvent) return;
    
    const id = this.selectedEvent._id || this.selectedEvent.id;
    this.registering = true;
    this.errorMessage = '';
    
    const payload: any = { selectedSlot: this.selectedSlot };
    if (paymentPayload) Object.assign(payload, paymentPayload);

    this.eventService.registerForEvent(id, payload).subscribe({
      next: (res: any) => {
        if (res.registration?.approvalStatus === 'pending') {
          alert('Registration submitted! Your request is pending admin approval.');
          this.pendingEventIds.add(String(id));
          
          this.addNotification({
            id: Date.now(),
            icon: '⏳',
            title: 'Registration Pending',
            message: `Your registration for "${this.selectedEvent.title}" is pending approval.`,
            time: 'Just now',
            read: false,
            type: 'pending'
          });
        } else {
          alert(res.message || 'Successfully registered!');
          this.registeredEventIds.add(String(id));
          
          this.addNotification({
            id: Date.now(),
            icon: '✅',
            title: 'Registration Confirmed',
            message: `You are registered for "${this.selectedEvent.title}".`,
            time: 'Just now',
            read: false,
            type: 'approval'
          });
        }
        
        this.registering = false;
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
        this.loadNotifications(); // Refresh notifications
      },
      error: (err: any) => {
        console.error('Registration failed:', err);
        this.errorMessage = err?.error?.message || 'Registration failed.';
        alert(this.errorMessage);
        this.registering = false;
      }
    });
  }

  cancelRegistration(ev: any) {
    const eventTitle = ev.title || 'this event';
    const eventId = ev._id || ev.id;
    
    let confirmationMessage = `Are you sure you want to cancel your registration for "${eventTitle}"?`;
    
    if (this.isPendingApproval(ev)) {
      confirmationMessage = `Your registration for "${eventTitle}" is still pending approval. Are you sure you want to cancel it?`;
    } else {
      confirmationMessage += ' This action cannot be undone.';
    }
    
    const isConfirmed = window.confirm(confirmationMessage);
    
    if (!isConfirmed) {
      return;
    }

    this.eventService.unregisterFromEvent(eventId).subscribe({
      next: (response: any) => {
        this.registeredEventIds.delete(String(eventId));
        this.pendingEventIds.delete(String(eventId));
        this.rejectedEventIds.delete(String(eventId));
        
        this.registeredEvents = this.registeredEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.pendingEvents = this.pendingEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.rejectedEvents = this.rejectedEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        
        alert(`Successfully cancelled registration for "${eventTitle}".`);
        
        this.addNotification({
          id: Date.now(),
          icon: '🗑️',
          title: 'Registration Cancelled',
          message: `Your registration for "${eventTitle}" has been cancelled.`,
          time: 'Just now',
          read: false,
          type: 'general'
        });
        
        this.loadEvents();
        
        if (this.selectedEvent && (this.selectedEvent._id || this.selectedEvent.id) === eventId) {
          this.selectedEvent = null;
          this.showEventModal = false;
        }

        // Refresh wallet (might have been refunded)
        this.authService.getWalletBalance().subscribe({ 
          next: (r: any) => { 
            this.walletBalance = r.walletBalance; 
            this.authService.updateWalletBalance(r.walletBalance); 
          } 
        });
        
        this.loadNotifications(); // Refresh notifications
      },
      error: (err: any) => {
        console.error('Cancellation failed:', err);
        this.errorMessage = err?.error?.message || 'Could not cancel registration. Please try again.';
        alert(this.errorMessage);
      }
    });
  }

  cancelFromModal() {
    if (!this.selectedEvent) return;
    this.cancelRegistration(this.selectedEvent);
  }

  // ─── PAYMENT MODAL ──────────────────────────────────────────────────────────

  closePaymentModal() { 
    this.showPaymentModal = false; 
    this.pendingPaymentEvent = null; 
  }

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
        this.doRegister({ 
          paymentMethod: 'wallet', 
          paymentAmount: this.pendingPaymentEvent.registrationFee, 
          useWallet: true 
        });
      }, 1000);
    } else {
      // Simulate other payment gateway (2 sec delay)
      setTimeout(() => {
        this.processingPayment = false;
        this.paymentSuccess = true;
        const txnId = 'TXN' + Date.now();
        const amount = this.pendingPaymentEvent.registrationFee;
        setTimeout(() => {
          this.showPaymentModal = false;
          this.doRegister({ 
            paymentMethod: this.selectedPaymentMethod, 
            paymentTxnId: txnId, 
            paymentAmount: amount 
          });
        }, 1000);
      }, 2000);
    }
  }

  // ─── TOP UP WALLET ──────────────────────────────────────────────────────────

  openTopUp() { 
    this.showTopUpModal = true; 
    this.topUpAmount = 200; 
    this.topUpSuccess = false; 
  }
  
  closeTopUp() { 
    this.showTopUpModal = false; 
  }

  submitTopUp() {
    if (!this.topUpAmount || this.topUpAmount < 1) return;
    this.topUpLoading = true;
    this.authService.topUpWallet(this.topUpAmount).subscribe({
      next: (r: any) => {
        this.walletBalance = r.walletBalance;
        this.authService.updateWalletBalance(r.walletBalance);
        this.topUpLoading = false;
        this.topUpSuccess = true;
        setTimeout(() => { 
          this.showTopUpModal = false; 
          this.topUpSuccess = false; 
        }, 1500);
      },
      error: () => { 
        this.topUpLoading = false; 
      }
    });
  }

  // ─── FEEDBACK ───────────────────────────────────────────────────────────────

  openFeedback(ev: any) {
    this.feedbackEvent = ev;
    this.feedbackRating = 0;
    this.feedbackComment = '';
    this.feedbackError = '';
    this.showFeedbackModal = true;
  }
  
  closeFeedback() { 
    this.showFeedbackModal = false; 
    this.feedbackEvent = null; 
  }

  setFeedbackRating(r: number) { 
    this.feedbackRating = r; 
  }

  submitFeedback() {
    if (!this.feedbackRating) { 
      this.feedbackError = 'Please select a star rating.'; 
      return; 
    }
    if (!this.feedbackEvent) return;
    
    this.feedbackSubmitting = true;
    this.feedbackError = '';
    const eventId = this.feedbackEvent._id || this.feedbackEvent.id;
    
    this.eventService.submitFeedback(eventId, { 
      rating: this.feedbackRating, 
      comment: this.feedbackComment 
    }).subscribe({
      next: () => {
        this.feedbackSubmitting = false;
        // Mark hasFeedback locally
        const reg = this.registeredEvents.find(r => String(r._id || r.id) === String(eventId));
        if (reg) reg.hasFeedback = true;
        this.closeFeedback();
        this.loadEvents(); // refresh to get updated feedback
      },
      error: (err: any) => { 
        this.feedbackError = err?.error?.message || 'Failed to submit feedback.'; 
        this.feedbackSubmitting = false; 
      }
    });
  }

  // ─── PROFILE MODAL ──────────────────────────────────────────────────────────

  openProfileModal() { 
    this.showProfileModal = true; 
  }
  
  closeProfileModal() { 
    this.showProfileModal = false; 
  }

  getRegistrationStatusClass(status: string) {
    return { 
      'status-pending': status === 'pending', 
      'status-approved': status === 'approved', 
      'status-rejected': status === 'rejected' 
    };
  }
  
  getStatusClass(s: string) {
    if (s === 'success' || s === 'paid') return 'badge-success';
    if (s === 'failed') return 'badge-danger';
    if (s === 'pending') return 'badge-warning';
    return 'badge-info';
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  logout() { 
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}