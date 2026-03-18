import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';
import { ChatService } from '../../services/chat.service';

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

  events: any[]          = [];
  filteredEvents: any[]  = [];
  registeredEventIds     = new Set<string>();
  pendingEventIds        = new Set<string>();
  registeredEvents: any[] = [];
  pendingEvents: any[] = [];

  notifications: any[] = [];
  payments: any[]      = [];
  leaderboard: any[]   = [];

  selectedEvent: any = null;
  selectedSlot: string = '';

  showEventModal = false;
  registering    = false;

  searchQuery    = '';
  categoryFilter = 'all';
  dateFilter     = '';
  statusFilter   = 'all';

  errorMessage = '';

  user: any = null;

  sidebarCollapsed    = false;
  mobileSidebarOpen   = false;
  selectedPaymentMethod = 'upi';

  totalPoints = 0;
  myRank      = 0;
  showConfetti = false;

  cancelling = false;
  
  // Auto-refresh
  private refreshSubscription!: Subscription;
  private isActive = true;
  lastUpdateTime: Date = new Date();

  private navSub!: Subscription | undefined;

  constructor(
    public authService: AuthService,
    private eventService: EventService,
    private router: Router,
    private chatService: ChatService
  ) {
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;

      if (req === 'BROWSE_EVENTS')  { this.setView('events');      }
      if (req === 'LEADERBOARD')    { this.setView('leaderboard'); }

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

    this.loadEvents();
    this.loadMyRegistrations();
    this.loadMockData();
    
    // FIXED: Start auto-refresh every 10 seconds (increased frequency)
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
  }
  
  setTab(tab: string)   { this.activeTab.set(tab);    }

  toggleSidebar()       { this.sidebarCollapsed    = !this.sidebarCollapsed;    }
  toggleMobileSidebar() { this.mobileSidebarOpen   = !this.mobileSidebarOpen;   }
  closeMobileSidebar()  { this.mobileSidebarOpen   = false;                     }

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

  // ─── EVENT DATA ─────────────────────────────────────────────────────────────

  loadEvents() {
    const filters: any = {};
    if (this.categoryFilter !== 'all') filters.category = this.categoryFilter;
    if (this.statusFilter   !== 'all') filters.status   = this.statusFilter;
    if (this.dateFilter)               filters.date      = this.dateFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (data: any) => {
        console.log('📡 All Events API Response:', data);
        const list     = Array.isArray(data) ? data : data?.events || [];
        this.events    = list;
        this.filterEvents();
      },
      error: (err: any) => {
        console.error('❌ Failed to load events:', err);
        this.events        = [];
        this.filteredEvents = [];
      }
    });
  }

  loadMyRegistrations() {
    this.eventService.getMyRegistrations().subscribe({
      next: (data: any) => {
        console.log('📡 My Registrations API Response:', data);
        const list = Array.isArray(data) ? data : data?.events || [];
        
        // Store previous counts to detect changes
        const prevPendingCount = this.pendingEvents?.length || 0;
        const prevApprovedCount = this.registeredEvents?.length || 0;
        
        // Split registrations based on approvalStatus from the backend
        const newRegisteredEvents = list.filter((ev: any) => 
          ev.approvalStatus === 'approved'
        );
        
        const newPendingEvents = list.filter((ev: any) => 
          ev.approvalStatus === 'pending'
        );

        // Check for newly approved events (were pending, now approved)
        if (this.pendingEvents && this.pendingEvents.length > 0) {
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
                read: false
              });
            });
          }
        }

        // Check for newly rejected events
        if (this.pendingEvents && this.pendingEvents.length > 0) {
          const newlyRejected = this.pendingEvents.filter(pending => {
            const pendingId = pending._id || pending.id;
            return !newPendingEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            }) && !newRegisteredEvents.some((ev: any) => {
              const evId = ev._id || ev.id;
              return evId === pendingId;
            });
          });
          
          if (newlyRejected.length > 0) {
            newlyRejected.forEach((event: any) => {
              this.addNotification({
                id: Date.now() + Math.random(),
                icon: '❌',
                title: 'Registration Rejected',
                message: `Your registration for "${event.title}" was not approved.`,
                time: 'Just now',
                read: false
              });
            });
          }
        }

        // Update the arrays
        this.registeredEvents = newRegisteredEvents;
        this.pendingEvents = newPendingEvents;

        // Update ID sets
        this.registeredEventIds = new Set(
          this.registeredEvents.map((ev: any) => String(ev?._id || ev?.id))
        );
        
        this.pendingEventIds = new Set(
          this.pendingEvents.map((ev: any) => String(ev?._id || ev?.id))
        );

        console.log('✅ Approved Events:', Array.from(this.registeredEventIds));
        console.log('⏳ Pending Events:', Array.from(this.pendingEventIds));
        
        // Calculate points
        this.calculateTotalPoints();
      },
      error: (err: any) => {
        console.error('❌ Failed to load registrations:', err);
        this.registeredEvents = [];
        this.pendingEvents = [];
        this.registeredEventIds = new Set();
        this.pendingEventIds = new Set();
      }
    });
  }

  calculateTotalPoints() {
    this.totalPoints = this.registeredEvents.length * 10;
  }

  addNotification(notification: any) {
    this.notifications.unshift(notification);
    if (this.notifications.length > 50) {
      this.notifications.pop();
    }
  }

  loadMockData() {
    this.notifications = [
      { id: 1, icon: '📅', title: 'Tech Fest Registration Open',  message: 'Slots filling fast', time: '2h ago', read: false },
      { id: 2, icon: '✅', title: 'Registration Confirmed', message: 'You registered for Cultural Night', time: '1d ago', read: true }
    ];
    
    this.leaderboard = [
      { rank: 1, name: 'Alex Johnson', college: 'Engineering', events: 12, points: 450, badges: ['🥇', '🔥'] },
      { rank: 2, name: 'Sarah Chen', college: 'Arts', events: 10, points: 380, badges: ['🥈'] },
      { rank: 3, name: 'Mike Peters', college: 'Science', events: 8, points: 320, badges: ['🥉'] },
      { rank: 4, name: this.getFullName(), college: 'Your College', events: this.registeredEvents.length, points: this.totalPoints, badges: [] }
    ];
    
    const myEntry = this.leaderboard.find(l => l.name === this.getFullName());
    this.myRank = myEntry ? myEntry.rank : 5;
  }

  // ─── FILTERING ──────────────────────────────────────────────────────────────

  filterEvents() {
    let list = [...this.events];

    if (this.searchQuery) {
      const q = this.searchQuery.toLowerCase();
      list = list.filter((e: any) =>
        e.title?.toLowerCase().includes(q) ||
        e.description?.toLowerCase().includes(q)
      );
    }

    if (this.categoryFilter !== 'all') list = list.filter((e: any) => e.category === this.categoryFilter);
    if (this.statusFilter   !== 'all') list = list.filter((e: any) => e.status   === this.statusFilter);

    this.filteredEvents = list;
  }

  onSearchChange() { this.filterEvents(); }
  onFilterChange() { this.loadEvents();   }

  // ─── EVENT UTILITIES ────────────────────────────────────────────────────────

  isRegistered(ev: any): boolean {
    return this.registeredEventIds.has(String(ev._id || ev.id));
  }

  isPendingApproval(ev: any): boolean {
    return this.pendingEventIds.has(String(ev._id || ev.id));
  }

  getRegistrationStatus(ev: any): string {
    if (this.isRegistered(ev)) return 'registered';
    if (this.isPendingApproval(ev)) return 'pending';
    return 'none';
  }

  isFull(ev: any): boolean {
    if (!ev.maxParticipants) return false;
    return (ev.currentParticipants || 0) >= ev.maxParticipants;
  }

  getSpotsLeft(ev: any): number {
    return Math.max((ev.maxParticipants || 0) - (ev.currentParticipants || 0), 0);
  }

  isSpotsUrgent(ev: any): boolean {
    return this.getSpotsLeft(ev) <= 5;
  }

  // ─── DASHBOARD HELPERS ──────────────────────────────────────────────────────

  getDashboardStats() {
    return {
      registered: this.registeredEvents.length,
      pending: this.pendingEvents?.length || 0,
      upcoming: this.registeredEvents.filter((e: any) => e.status === 'upcoming').length,
      completed: this.registeredEvents.filter((e: any) => e.status === 'completed').length
    };
  }

  getTrendingEvents()   { return this.events.slice(0, 4); }

  // FIXED: Removed pending approval from schedule - only shows upcoming events regardless of approval status
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

  formatDate(date: any)     { if (!date) return ''; return new Date(date).toLocaleDateString();  }
  formatDateTime(date: any) { if (!date) return ''; return new Date(date).toLocaleString();      }

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

  get unreadCount()             { return this.notifications.filter(n => !n.read).length;   }
  markNotificationRead(n: any)  { n.read = true;                                            }
  markAllRead()                 { this.notifications.forEach(n => n.read = true);           }

  // ─── REGISTRATION ───────────────────────────────────────────────────────────

  registerForEvent() {
    if (!this.selectedEvent) return;
    
    if (this.selectedEvent.slots?.length > 0 && !this.selectedSlot) {
      this.errorMessage = 'Please select a time slot first.';
      return;
    }

    const id = this.selectedEvent._id || this.selectedEvent.id;
    this.registering = true;
    this.errorMessage = '';

    this.eventService.registerForEvent(id, this.selectedSlot).subscribe({
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
            read: false
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
            read: false
          });
        }
        
        this.registering = false;
        this.selectedSlot = '';
        this.loadMyRegistrations();
        this.closeEventModal();
        
        this.showConfetti = true; 
        setTimeout(() => this.showConfetti = false, 3000);
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
        
        this.registeredEvents = this.registeredEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        this.pendingEvents = this.pendingEvents.filter(e => 
          (e._id || e.id) !== eventId
        );
        
        alert(`Successfully cancelled registration for "${eventTitle}".`);
        
        this.addNotification({
          id: Date.now(),
          icon: '🗑️',
          title: 'Registration Cancelled',
          message: `Your registration for "${eventTitle}" has been cancelled.`,
          time: 'Just now',
          read: false
        });
        
        this.loadEvents();
        
        if (this.selectedEvent && (this.selectedEvent._id || this.selectedEvent.id) === eventId) {
          this.selectedEvent = null;
          this.showEventModal = false;
        }
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

  openEventModal(event: any)  { 
    this.selectedEvent = event; 
    this.showEventModal = true;  
  }
  
  closeEventModal()           { 
    this.showEventModal = false; 
    this.selectedEvent = null;
    this.selectedSlot = '';
    this.errorMessage = '';
  }

  // ─── PAYMENT STATUS ─────────────────────────────────────────────────────────

  getStatusClass(status: string) {
    switch (status) {
      case 'success': return 'text-success';
      case 'failed':  return 'text-danger';
      case 'pending': return 'text-warning';
      default:        return 'text-info';
    }
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}