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
  cancelledEventIds = new Set<string>();
  registeredEvents: any[] = [];
  pendingEvents: any[] = [];
  rejectedEvents: any[] = [];
  cancelledEvents: any[] = [];

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
        
        // Filter out cancelled events from display
        this.events = list
          .filter((e: any) => e.status !== 'cancelled')
          .map((e: any) => ({ 
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
      
      // Helper function to compute event status based on dates
      const computeEventStatus = (event: any): string => {
        if (event.status === 'cancelled') return 'cancelled';
        const now = new Date();
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        
        if (now < startDate) return 'upcoming';
        if (now >= startDate && now <= endDate) return 'ongoing';
        if (now > endDate) return 'completed';
        return event.status || 'upcoming';
      };
      
      // Split registrations based on status - PRESERVE ALL FIELDS including hasFeedback and feedback
      const newRegisteredEvents = list.filter((ev: any) => 
        ev.approvalStatus === 'approved' && ev.status !== 'cancelled'
      ).map((e: any) => ({ 
        ...e, 
        status: computeEventStatus(e),
        approvalStatus: e.approvalStatus,
        hasFeedback: e.hasFeedback || false,
        feedback: e.feedback || []  // ✅ ADDED: include feedback array
      }));
      
      const newPendingEvents = list.filter((ev: any) => 
        ev.approvalStatus === 'pending' && ev.status !== 'cancelled'
      ).map((e: any) => ({ 
        ...e, 
        status: computeEventStatus(e),
        approvalStatus: e.approvalStatus,
        hasFeedback: e.hasFeedback || false
      }));

      const newRejectedEvents = list.filter((ev: any) => 
        ev.approvalStatus === 'rejected' && ev.status !== 'cancelled'
      ).map((e: any) => ({ 
        ...e, 
        status: computeEventStatus(e),
        approvalStatus: e.approvalStatus,
        hasFeedback: e.hasFeedback || false
      }));

      // Track cancelled events separately
      const newCancelledEvents = list.filter((ev: any) => 
        ev.status === 'cancelled'
      ).map((e: any) => ({ 
        ...e, 
        status: 'cancelled',
        approvalStatus: e.approvalStatus,
        hasFeedback: e.hasFeedback || false
      }));

      console.log('📊 Registration counts:', {
        registered: newRegisteredEvents.length,
        pending: newPendingEvents.length,
        rejected: newRejectedEvents.length,
        cancelled: newCancelledEvents.length
      });
      
      // Log events with feedback data
      if (newRegisteredEvents && newRegisteredEvents.length > 0) {
        console.log('📝 Events with feedback data:', newRegisteredEvents.map((e: any) => ({
          title: e.title,
          status: e.status,
          approvalStatus: e.approvalStatus,
          hasFeedback: e.hasFeedback,
          feedbackCount: e.feedback?.length || 0
        })));
      } else {
        console.log('📝 No approved events found');
      }

      // Check for newly cancelled events
      if (list.length > 0 && (this.registeredEvents.length > 0 || this.pendingEvents.length > 0 || this.rejectedEvents.length > 0)) {
        const allPrevEvents = [
          ...this.registeredEvents,
          ...this.pendingEvents,
          ...this.rejectedEvents
        ];
        
        const newlyCancelled = allPrevEvents.filter(prev => {
          const prevId = prev._id || prev.id;
          return newCancelledEvents.some((cancelled: any) => {
            const cancelledId = cancelled._id || cancelled.id;
            return cancelledId === prevId;
          });
        });
        
        if (newlyCancelled.length > 0) {
          console.log('🚫 Events cancelled by admin:', newlyCancelled);
          
          newlyCancelled.forEach((event: any) => {
            const hadPayment = event.paymentAmount && event.paymentAmount > 0;
            
            alert(`🚫 The event "${event.title}" has been cancelled by the organizer.${hadPayment ? ' Your payment will be refunded.' : ''}`);
            
            this.addNotification({
              id: Date.now() + Math.random(),
              icon: '🚫',
              title: 'Event Cancelled',
              message: `The event "${event.title}" has been cancelled by the organizer.${hadPayment ? ' Refund processed.' : ''}`,
              time: 'Just now',
              read: false,
              type: 'cancellation',
              data: { eventId: event._id || event.id, hadPayment }
            });

            if (hadPayment) {
              setTimeout(() => {
                this.authService.getWalletBalance().subscribe({ 
                  next: (r: any) => { 
                    this.walletBalance = r.walletBalance; 
                    this.authService.updateWalletBalance(r.walletBalance); 
                    alert(`💰 Refund of ₹${event.paymentAmount} has been credited to your wallet.`);
                  } 
                });
              }, 500);
            }
          });
        }
      }

      // Check for newly rejected events
      if (this.pendingEvents && this.pendingEvents.length > 0 && newPendingEvents) {
        const newlyRejected = this.pendingEvents.filter(pending => {
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
            alert(`❌ Your registration for "${event.title}" was rejected.`);
            
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

      // Check for newly approved events
      if (this.pendingEvents && this.pendingEvents.length > 0 && newPendingEvents) {
        const newlyApproved = this.pendingEvents.filter(pending => {
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
          
          if (newlyApproved.length === 1) {
            alert(`✅ Your registration for "${newlyApproved[0].title}" has been approved!`);
          } else {
            alert(`✅ ${newlyApproved.length} of your registrations have been approved!`);
          }
          
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
      this.registeredEvents = newRegisteredEvents || [];
      this.pendingEvents = newPendingEvents || [];
      this.rejectedEvents = newRejectedEvents || [];
      this.cancelledEvents = newCancelledEvents || [];

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

      this.cancelledEventIds = new Set(
        this.cancelledEvents.map((ev: any) => String(ev?._id || ev?.id))
      );

      // Update payments list
      this.payments = list.filter((e: any) => (e.paymentAmount || 0) > 0).map((e: any) => ({
        id: e.paymentTxnId || ('TXN-' + e.registrationId),
        event: e.title,
        amount: e.paymentAmount,
        status: e.paymentStatus === 'paid' ? (e.status === 'cancelled' ? 'refunded' : 'success') : e.paymentStatus,
        method: e.paymentMethod || '—',
        date: e.registeredAt || e.createdAt
      }));

      console.log('✅ Final States:', {
        registered: Array.from(this.registeredEventIds),
        pending: Array.from(this.pendingEventIds),
        rejected: Array.from(this.rejectedEventIds),
        cancelled: Array.from(this.cancelledEventIds)
      });
      
      this.calculateTotalPoints();
    },
    error: (err: any) => {
      console.error('❌ Failed to load registrations:', err);
      this.registeredEvents = [];
      this.pendingEvents = [];
      this.rejectedEvents = [];
      this.cancelledEvents = [];
      this.registeredEventIds = new Set();
      this.pendingEventIds = new Set();
      this.rejectedEventIds = new Set();
      this.cancelledEventIds = new Set();
    }
  });
}
  loadNotifications() {
    this.notifications = this.notifService.notifications();
    console.log('📬 Notifications loaded:', this.notifications.length);
  }

  loadLeaderboard() {
    this.leaderboard = [
      { rank: 1, name: 'Arjun Kumar', college: 'IIT Madras', events: 12, points: 2400, badges: ['🏆', '🎯', '⚡'] },
      { rank: 2, name: 'Priya Sharma', college: 'NIT Trichy', events: 10, points: 2100, badges: ['🥈', '🎨'] },
      { rank: 3, name: 'Vikram Nair', college: 'BITS Pilani', events: 9, points: 1950, badges: ['🥉', '💡'] },
      { rank: 4, name: 'Meera Patel', college: 'VIT Vellore', events: 8, points: 1800, badges: ['🎯'] },
      { rank: 5, name: 'Rahul Singh', college: 'SRM Chennai', events: 7, points: 1600, badges: ['⚡'] },
      { rank: 6, name: this.getFullName(), college: this.getCollege(), events: this.registeredEvents.length, points: this.totalPoints, badges: [] }
    ];
    
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

  isCancelled(ev: any): boolean {
    return ev.status === 'cancelled' || this.cancelledEventIds.has(String(ev._id || ev.id));
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
           this.rejectedEvents.find(r => String(r._id || r.id) === String(eventId)) ||
           this.cancelledEvents.find(r => String(r._id || r.id) === String(eventId)) || null;
  }

  // ✅ NEW: Get user's feedback for a specific event
  getUserFeedback(eventId: string): any {
    const event = this.registeredEvents.find(e => String(e._id || e.id) === String(eventId));
    if (!event || !event.feedback) return null;
    
    const userId = this.authService.getUserId();
    const userFeedback = event.feedback.find((f: any) => String(f.userId) === String(userId));
    
    return userFeedback || null;
  }

  // ✅ FIXED: Check if user can give feedback (now using computed status)
  canGiveFeedback(ev: any): boolean {
    // Compute if event is completed by date
    const isCompletedByDate = () => {
      if (!ev.endDate) return false;
      const now = new Date();
      const endDate = new Date(ev.endDate);
      return now > endDate;
    };
    
    const isCompleted = ev.status === 'completed' || isCompletedByDate();
    const isApproved = ev.approvalStatus === 'approved';
    const hasNotGivenFeedback = !ev.hasFeedback;
    
    console.log('🔍 Feedback check for:', ev.title, {
      status: ev.status,
      isCompletedByDate: isCompletedByDate(),
      isCompleted,
      isApproved,
      hasNotGivenFeedback
    });
    
    return isCompleted && isApproved && hasNotGivenFeedback;
  }

  getPastEventsWithFeedback(): any[] {
    return this.registeredEvents.filter(e => this.canGiveFeedback(e));
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
      completed: this.registeredEvents.filter(e => this.canGiveFeedback(e)).length,
      pending: this.pendingEvents?.length || 0,
      rejected: this.rejectedEvents?.length || 0,
      cancelled: this.cancelledEvents?.length || 0,
      approved: this.registeredEvents.filter(e => e.approvalStatus === 'approved').length,
      total: this.registeredEvents.length + this.pendingEvents.length + this.rejectedEvents.length
    };
  }

  getTrendingEvents() { 
    return this.events.filter(e => e.status !== 'completed').slice(0, 4); 
  }

  getUpcomingSchedule() {
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
    
    if (n.type === 'rejection' && n.data?.eventId) {
      const event = this.events.find(e => (e._id || e.id) === n.data.eventId);
      if (event) {
        this.openEventModal(event);
      }
    } else if (n.type === 'approval' && n.data?.eventId) {
      this.setView('registered');
    } else if (n.type === 'cancellation' && n.data?.eventId) {
      this.setView('events');
      if (n.data?.hadPayment) {
        alert('💰 Refund has been processed to your wallet.');
      }
    } else if (n.type === 'refund' && n.data?.amount) {
      alert(`💰 Refund of ₹${n.data.amount} has been credited to your wallet.`);
    }
  }
  
  markAllRead() { 
    this.notifService.markAllRead(); 
    this.loadNotifications();
  }
  
  deleteNotification(n: any) { 
    this.notifService.delete(n._id); 
    this.loadNotifications();
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
      'pending': '⏳',
      'cancellation': '🚫',
      'refund': '💰'
    };
    return icons[type] || '🔔';
  }

  // ─── REGISTRATION FLOW ──────────────────────────────────────────────────────

  openEventModal(event: any) {
    if (event.status === 'cancelled') {
      alert('This event has been cancelled by the organizer.');
      return;
    }
    
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
    
    if (this.selectedEvent.status === 'cancelled') {
      alert('This event has been cancelled by the organizer and is no longer available for registration.');
      return;
    }
    
    if (this.isRejected(this.selectedEvent)) {
      alert('Your previous registration for this event was rejected. You can try registering again.');
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
    
    if (paymentPayload) {
      payload.paymentMethod = paymentPayload.paymentMethod;
      payload.paymentAmount = paymentPayload.paymentAmount;
      
      if (paymentPayload.paymentTxnId) {
        payload.paymentTxnId = paymentPayload.paymentTxnId;
      }
      
      if (paymentPayload.useWallet) {
        payload.useWallet = true;
      }
      
      console.log(`💳 Sending payment data to backend:`, payload);
    }

    this.eventService.registerForEvent(id, payload).subscribe({
      next: (res: any) => {
        console.log('✅ Registration response:', res);
        
        if (res.walletBalance !== undefined) {
          this.walletBalance = res.walletBalance;
          this.authService.updateWalletBalance(res.walletBalance);
        }
        
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
          let paymentMsg = '';
          if (res.paymentStatus === 'paid') {
            if (payload.paymentMethod === 'wallet') {
              paymentMsg = ` Payment of ₹${this.selectedEvent.registrationFee} deducted from wallet.`;
            } else if (payload.paymentMethod) {
              paymentMsg = ` Payment of ₹${this.selectedEvent.registrationFee} processed via ${payload.paymentMethod.toUpperCase()}.`;
            }
          }
          
          alert(`✅ Registration successful!${paymentMsg}`);
          
          this.registeredEventIds.add(String(id));
          
          this.addNotification({
            id: Date.now(),
            icon: '✅',
            title: 'Registration Confirmed',
            message: `You are registered for "${this.selectedEvent.title}".${paymentMsg}`,
            time: 'Just now',
            read: false,
            type: 'approval'
          });
        }
        
        this.registering = false;
        this.selectedSlot = '';
        this.loadMyRegistrations();
        this.closeEventModal();
        
        this.showConfetti = true;
        setTimeout(() => this.showConfetti = false, 3000);
        this.notifService.reload();
        this.loadNotifications();
      },
      error: (err: any) => {
        console.error('Registration failed:', err);
        
        if (err.error?.message?.includes('already registered')) {
          this.errorMessage = 'You are already registered for this event.';
        } else if (err.error?.message?.includes('insufficient wallet balance')) {
          this.errorMessage = 'Insufficient wallet balance. Please top up your wallet.';
        } else if (err.error?.message?.includes('payment failed')) {
          this.errorMessage = 'Payment failed. Please try again with a different method.';
        } else {
          this.errorMessage = err?.error?.message || 'Registration failed.';
        }
        
        alert(this.errorMessage);
        this.registering = false;
      }
    });
  }

  cancelRegistration(ev: any) {
    const eventTitle = ev.title || 'this event';
    const eventId = ev._id || ev.id;
    const eventFee = ev.registrationFee || ev.paymentAmount || 0;
    const hadPayment = eventFee > 0 && (ev.paymentStatus === 'paid' || ev.paymentMethod);
    
    let confirmationMessage = `Are you sure you want to cancel your registration for "${eventTitle}"?`;
    
    if (this.isPendingApproval(ev)) {
      confirmationMessage = `Your registration for "${eventTitle}" is still pending approval. Are you sure you want to cancel it?`;
    } else if (hadPayment) {
      confirmationMessage = `Are you sure you want to cancel your registration for "${eventTitle}"? ₹${eventFee} will be refunded to your ${ev.paymentMethod || 'original payment method'}.`;
    } else {
      confirmationMessage += ' This action cannot be undone.';
    }
    
    const isConfirmed = window.confirm(confirmationMessage);
    
    if (!isConfirmed) {
      return;
    }

    this.eventService.unregisterFromEvent(eventId).subscribe({
      next: (response: any) => {
        console.log('✅ Cancellation response:', response);
        
        this.registeredEventIds.delete(String(eventId));
        this.pendingEventIds.delete(String(eventId));
        this.rejectedEventIds.delete(String(eventId));
        this.cancelledEventIds.delete(String(eventId));
        
        this.registeredEvents = this.registeredEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.pendingEvents = this.pendingEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.rejectedEvents = this.rejectedEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.cancelledEvents = this.cancelledEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        
        let refundMessage = `Successfully cancelled registration for "${eventTitle}".`;
        let notificationType = 'general';
        let notificationIcon = '🗑️';
        
        if (hadPayment) {
          if (response?.refundProcessed || response?.walletBalance !== undefined) {
            refundMessage = `✅ Registration cancelled! ₹${eventFee} has been refunded to your ${response.refundMethod || ev.paymentMethod || 'wallet'}.`;
            notificationType = 'refund';
            notificationIcon = '💰';
            
            this.addNotification({
              id: Date.now(),
              icon: '💰',
              title: 'Refund Processed',
              message: `Refund of ₹${eventFee} for "${eventTitle}" has been processed.`,
              time: 'Just now',
              read: false,
              type: 'refund',
              data: { amount: eventFee, eventId }
            });
          } else {
            refundMessage = `Registration cancelled. Refund of ₹${eventFee} will be processed within 5-7 business days.`;
          }
          
          if (response?.walletBalance !== undefined) {
            this.walletBalance = response.walletBalance;
            this.authService.updateWalletBalance(response.walletBalance);
          }
        }
        
        alert(refundMessage);
        
        this.addNotification({
          id: Date.now(),
          icon: notificationIcon,
          title: 'Registration Cancelled',
          message: hadPayment ? `Your registration for "${eventTitle}" has been cancelled. Refund initiated.` : `Your registration for "${eventTitle}" has been cancelled.`,
          time: 'Just now',
          read: false,
          type: notificationType
        });
        
        this.loadEvents();
        
        if (this.selectedEvent && (this.selectedEvent._id || this.selectedEvent.id) === eventId) {
          this.selectedEvent = null;
          this.showEventModal = false;
        }

        this.authService.getWalletBalance().subscribe({ 
          next: (r: any) => { 
            this.walletBalance = r.walletBalance; 
            this.authService.updateWalletBalance(r.walletBalance); 
          } 
        });
        
        this.loadNotifications();
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

    const amount = this.pendingPaymentEvent.registrationFee;
    const method = this.selectedPaymentMethod;

    if (method === 'wallet' && this.walletBalance < amount) {
      this.processingPayment = false;
      alert('Insufficient wallet balance. Please top up or choose another method.');
      return;
    }

    console.log(`💳 Processing ${method} payment of ₹${amount}...`);
    
    setTimeout(() => {
      this.processingPayment = false;
      this.paymentSuccess = true;
      
      const txnId = method.toUpperCase() + '-' + Date.now() + '-' + Math.floor(Math.random() * 1000);
      
      let methodName = method === 'upi' ? 'UPI' : 
                       method === 'card' ? 'Card' : 
                       method === 'netbanking' ? 'Net Banking' : 'Wallet';
      
      alert(`✅ Payment of ₹${amount} via ${methodName} successful! Completing registration...`);
      
      setTimeout(() => {
        this.showPaymentModal = false;
        this.doRegister({ 
          paymentMethod: method, 
          paymentTxnId: txnId, 
          paymentAmount: amount,
          useWallet: method === 'wallet' 
        });
      }, 1000);
      
    }, 2000);
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
        
        this.addNotification({
          id: Date.now(),
          icon: '💰',
          title: 'Wallet Top-up',
          message: `₹${this.topUpAmount} added to your wallet.`,
          time: 'Just now',
          read: false,
          type: 'general'
        });
        
        alert(`💰 ₹${this.topUpAmount} added to your wallet successfully!`);
        
        setTimeout(() => { 
          this.showTopUpModal = false; 
          this.topUpSuccess = false; 
        }, 1500);
      },
      error: (err) => { 
        this.topUpLoading = false; 
        alert('Top-up failed: ' + (err.error?.message || 'Please try again.'));
      }
    });
  }

  // ─── FEEDBACK ───────────────────────────────────────────────────────────────

  openFeedback(ev: any) {
    console.log('🔵 Opening feedback for event:', ev);
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
    console.log('⭐ Rating selected:', r);
    this.feedbackRating = r; 
  }

  submitFeedback() {
  console.log('📝 Submitting feedback...');
  console.log('Rating:', this.feedbackRating);
  console.log('Comment:', this.feedbackComment);
  console.log('Event:', this.feedbackEvent);
  
  if (!this.feedbackRating) { 
    this.feedbackError = 'Please select a star rating.'; 
    return; 
  }
  if (!this.feedbackEvent) {
    this.feedbackError = 'No event selected.';
    return;
  }
  
  // Check if event is actually completed before submitting
  const isEventCompleted = () => {
    if (!this.feedbackEvent.endDate) return false;
    const now = new Date();
    const endDate = new Date(this.feedbackEvent.endDate);
    return now > endDate;
  };
  
  console.log('Event completion check:', {
    eventId: this.feedbackEvent._id,
    title: this.feedbackEvent.title,
    status: this.feedbackEvent.status,
    endDate: this.feedbackEvent.endDate,
    currentDate: new Date(),
    isCompletedByDate: isEventCompleted(),
    isCompleted: this.feedbackEvent.status === 'completed' || isEventCompleted()
  });
  
  if (!isEventCompleted() && this.feedbackEvent.status !== 'completed') {
    this.feedbackError = 'Feedback can only be given after the event is completed.';
    alert(this.feedbackError);
    return;
  }
  
  // Check registration
  const eventId = this.feedbackEvent._id || this.feedbackEvent.id;
  const registration = this.getMyRegistration(eventId);
  console.log('Registration check:', {
    eventId,
    hasRegistration: !!registration,
    approvalStatus: registration?.approvalStatus,
    hasFeedback: registration?.hasFeedback,
    status: registration?.status
  });
  
  if (!registration || registration.approvalStatus !== 'approved') {
    this.feedbackError = 'Only approved registrants can give feedback.';
    alert(this.feedbackError);
    return;
  }
  
  if (registration.hasFeedback) {
    this.feedbackError = 'You have already given feedback for this event.';
    alert(this.feedbackError);
    return;
  }
  
  this.feedbackSubmitting = true;
  this.feedbackError = '';
  
  const payload = { 
    rating: this.feedbackRating, 
    comment: this.feedbackComment 
  };
  
  console.log('📤 Sending feedback to backend:', {
    url: `${this.eventService['apiUrl']}/${eventId}/feedback`,
    payload: payload
  });
  
  this.eventService.submitFeedback(eventId, payload).subscribe({
    next: (response: any) => {
      console.log('✅ Feedback submitted successfully:', response);
      this.feedbackSubmitting = false;
      
      // Mark hasFeedback locally
      if (registration) registration.hasFeedback = true;
      
      this.closeFeedback();
      this.loadEvents(); // refresh to get updated feedback
      this.loadMyRegistrations(); // refresh registrations
      
      alert('⭐ Thank you for your feedback!');
      
      // Add notification for feedback submitted
      this.addNotification({
        id: Date.now(),
        icon: '⭐',
        title: 'Feedback Submitted',
        message: `Your feedback for "${this.feedbackEvent.title}" has been submitted.`,
        time: 'Just now',
        read: false,
        type: 'general'
      });
    },
    error: (err: any) => { 
      console.error('❌ Feedback submission failed:', err);
      // Try to get the actual error message from backend
      if (err.error) {
        console.error('Backend error response:', err.error);
        if (typeof err.error === 'object') {
          this.feedbackError = err.error.message || JSON.stringify(err.error);
        } else {
          this.feedbackError = err.error;
        }
      } else {
        this.feedbackError = 'Failed to submit feedback. Please try again.';
      }
      alert(this.feedbackError);
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
    if (s === 'refunded') return 'badge-info';
    return 'badge-info';
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  logout() { 
    this.authService.logout(); 
    this.router.navigate(['/login']); 
  }
}