import { Component, OnInit, OnDestroy, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { EventService } from '../../services/event.service';
import { AuthService } from '../../services/auth.service';

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
  pendingRegistrationIds = new Set<string>();
  registeredEvents: any[] = [];
  pendingRegistrations: any[] = [];
  approvedRegistrations: any[] = [];

  notifications: any[] = [];
  payments: any[] = [];
  leaderboard: any[] = [];

  selectedEvent: any = null;
  showEventModal = false;
  registering = false;

  searchQuery = '';
  categoryFilter = 'all';
  dateFilter = '';
  statusFilter = 'all';

  errorMessage = '';
  user: any = null;

  sidebarCollapsed = false;
  mobileSidebarOpen = false;
  selectedPaymentMethod = 'upi';

  totalPoints = 0;
  myRank = 0;
  showConfetti = false;

  private subscriptions: Subscription[] = [];

  constructor(
    public authService: AuthService,
    private eventService: EventService,
    private router: Router
  ) {
    console.log('✅ StudentDashboard constructor');
  }

  ngOnInit() {
    console.log('🔵 Dashboard ngOnInit started');
    
    // Check authentication
    if (!this.authService.isLoggedIn()) {
      console.log('❌ Not logged in, redirecting');
      this.router.navigate(['/login']);
      return;
    }

    // Check role
    const userRole = this.authService.getRole();
    console.log('User role:', userRole);
    
    if (userRole !== 'student') {
      console.log('❌ Wrong role, redirecting');
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    // Get user data
    this.user = this.authService.getUser() || {};
    console.log('✅ User data loaded:', this.user);

    // Load data
    this.loadEvents();
    this.loadMyRegistrations();
    this.loadMockData();
    this.loadLeaderboard();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  // ─── UI CONTROLS ────────────────────────────────────────────────────────────

  setView(view: string) { 
    console.log('Setting view to:', view);
    this.currentView.set(view); 
  }
  
  setTab(tab: string) { 
    this.activeTab.set(tab);    
  }

  toggleSidebar() { 
    this.sidebarCollapsed = !this.sidebarCollapsed;    
  }
  
  toggleMobileSidebar() { 
    this.mobileSidebarOpen = !this.mobileSidebarOpen;   
  }
  
  closeMobileSidebar() { 
    this.mobileSidebarOpen = false;                     
  }

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
    if (this.statusFilter !== 'all') filters.status = this.statusFilter;
    if (this.dateFilter) filters.date = this.dateFilter;

    const sub = this.eventService.getAllEvents(filters).subscribe({
      next: (data: any) => {
        const list = Array.isArray(data) ? data : data?.events || [];
        this.events = list;
        this.filterEvents();
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.events = [];
        this.filteredEvents = [];
      }
    });
    this.subscriptions.push(sub);
  }

  loadMyRegistrations() {
    const sub = this.eventService.getMyRegistrations().subscribe({
      next: (data: any) => {
        console.log('📥 Registrations response:', data);
        
        // Handle different response structures
        const registrations = Array.isArray(data) ? data : data?.registrations || [];
        
        // Store all registrations
        this.registeredEvents = registrations;
        
        // Separate by status
        this.pendingRegistrations = registrations.filter((r: any) => r.status === 'pending');
        this.approvedRegistrations = registrations.filter((r: any) => r.status === 'approved');
        
        // Track IDs for quick lookup
        this.registeredEventIds = new Set(
          this.approvedRegistrations.map((reg: any) => String(reg.event?._id || reg.eventId || reg._id))
        );
        
        this.pendingRegistrationIds = new Set(
          this.pendingRegistrations.map((reg: any) => String(reg.event?._id || reg.eventId || reg._id))
        );
        
        console.log('✅ Loaded registrations:', registrations.length);
        console.log('⏳ Pending:', this.pendingRegistrations.length);
        console.log('✅ Approved:', this.approvedRegistrations.length);
      },
      error: (err) => {
        console.error('❌ Error loading registrations:', err);
        this.registeredEvents = [];
        this.registeredEventIds = new Set();
        this.pendingRegistrationIds = new Set();
        this.pendingRegistrations = [];
        this.approvedRegistrations = [];
      }
    });
    this.subscriptions.push(sub);
  }

  loadLeaderboard() {
    // Mock data - replace with actual API call later
    this.leaderboard = [
      { rank: 1, name: 'Riya Sharma', college: 'MIT', events: 8, points: 1200, badges: ['🥇'] },
      { rank: 2, name: 'Arjun Singh', college: 'NIT', events: 6, points: 950, badges: ['🥈'] },
      { rank: 3, name: 'Priya Patel', college: 'DTU', events: 5, points: 800, badges: ['🥉'] },
      { rank: 4, name: 'Rahul Verma', college: 'BITS', events: 4, points: 600, badges: [] },
      { rank: 5, name: 'Neha Gupta', college: 'VIT', events: 3, points: 450, badges: [] },
    ];
    
    const userEmail = this.getEmail();
    const userRank = this.leaderboard.findIndex(item => 
      item.name.toLowerCase().includes('rahul') || 
      item.name.toLowerCase().includes('test')
    );
    this.myRank = userRank !== -1 ? userRank + 1 : 5;
    this.totalPoints = this.myRank === 5 ? 450 : 600;
  }

  loadMockData() {
    this.notifications = [
      { id: 1, icon: '📅', title: 'Tech Fest Registration Open', message: 'Slots filling fast', time: '2h ago', read: false },
      { id: 2, icon: '✅', title: 'Registration Confirmed', message: 'You registered for Cultural Night', time: '1d ago', read: true }
    ];
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
    if (this.statusFilter !== 'all') list = list.filter((e: any) => e.status === this.statusFilter);

    this.filteredEvents = list;
  }

  onSearchChange() { this.filterEvents(); }
  onFilterChange() { this.loadEvents(); }

  // ─── EVENT UTILITIES ────────────────────────────────────────────────────────

  isRegistered(ev: any): boolean {
    return this.registeredEventIds.has(String(ev._id || ev.id));
  }

  isPending(ev: any): boolean {
    return this.pendingRegistrationIds.has(String(ev._id || ev.id));
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
      registered: this.approvedRegistrations.length,
      pending: this.pendingRegistrations.length,
      upcoming: this.approvedRegistrations.filter((e: any) => e.event?.status === 'upcoming').length,
      completed: this.approvedRegistrations.filter((e: any) => e.event?.status === 'completed').length
    };
  }

  getTrendingEvents() { return this.events.slice(0, 4); }

  getUpcomingSchedule() {
    return this.approvedRegistrations
      .filter((reg: any) => reg.event?.status === 'upcoming')
      .map((reg: any) => reg.event)
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
  }

  // ─── DATE FORMATTERS ────────────────────────────────────────────────────────

  formatDate(date: any) { if (!date) return ''; return new Date(date).toLocaleDateString(); }
  formatDateTime(date: any) { if (!date) return ''; return new Date(date).toLocaleString(); }

  // ─── NOTIFICATIONS ──────────────────────────────────────────────────────────

  get unreadCount() { return this.notifications.filter(n => !n.read).length; }
  markNotificationRead(n: any) { n.read = true; }
  markAllRead() { this.notifications.forEach(n => n.read = true); }

  // ─── REGISTRATION ───────────────────────────────────────────────────────────

  registerForEvent() {
    if (!this.selectedEvent) return;
    const id = this.selectedEvent._id || this.selectedEvent.id;
    this.registering = true;

    const sub = this.eventService.registerForEvent(id).subscribe({
      next: (response: any) => {
        console.log('✅ Registration response:', response);
        this.registering = false;
        this.loadMyRegistrations();
        this.closeEventModal();
        
        // Show appropriate message based on response
        if (response.status === 'pending') {
          alert('Registration submitted! Waiting for admin approval.');
        } else {
          alert('Successfully registered for event!');
        }
      },
      error: (err: any) => {
        console.error('❌ Registration error:', err);
        this.errorMessage = err?.error?.message || 'Registration failed.';
        this.registering = false;
      }
    });
    this.subscriptions.push(sub);
  }

  cancelRegistration(ev: any) {
    const id = ev._id || ev.id;
    const sub = this.eventService.unregisterFromEvent(id).subscribe({
      next: () => {
        this.registeredEventIds.delete(String(id));
        this.pendingRegistrationIds.delete(String(id));
        this.registeredEvents = this.registeredEvents.filter(e => e !== ev);
        this.loadEvents();
        this.loadMyRegistrations();
        alert('Registration cancelled successfully');
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Could not cancel registration.';
      }
    });
    this.subscriptions.push(sub);
  }

  cancelFromModal() {
    if (!this.selectedEvent) return;
    this.cancelRegistration(this.selectedEvent);
    this.closeEventModal();
  }

  openEventModal(event: any) { 
    this.selectedEvent = event; 
    this.showEventModal = true; 
    this.setTab('details');
  }
  
  closeEventModal() { 
    this.showEventModal = false; 
    this.selectedEvent = null; 
  }

  // ─── PAYMENT STATUS ─────────────────────────────────────────────────────────

  getStatusClass(status: string) {
    switch (status) {
      case 'success': return 'text-success';
      case 'failed': return 'text-danger';
      case 'pending': return 'text-warning';
      default: return 'text-info';
    }
  }

  // ─── AUTH ───────────────────────────────────────────────────────────────────

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}