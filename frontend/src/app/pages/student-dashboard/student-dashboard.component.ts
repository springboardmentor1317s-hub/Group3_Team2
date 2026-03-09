import { Component, OnInit, OnDestroy, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
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
  registeredEvents: any[] = [];

  notifications: any[] = [];
  payments: any[]      = [];
  leaderboard: any[]   = [];

  selectedEvent: any = null;

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

  private navSub!: Subscription | undefined;

  constructor(
    public authService: AuthService,
    private eventService: EventService,
    private router: Router,
    private chatService: ChatService
  ) {
    // ✅ React to chatbot navigation requests (e.g. "Browse Events" button)
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;

      if (req === 'BROWSE_EVENTS')  { this.setView('events');      }
      if (req === 'LEADERBOARD')    { this.setView('leaderboard'); }

      // Clear the request so it won't fire again
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    // ✅ PROTECTED ROUTE CHECK: verify this tab's stored session is actually a student
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('student')) {
      // Clear any stale/wrong-role session and redirect
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }

    // ✅ FIX: UserData uses `fullName`, not `name`
    this.user = this.authService.getUser() || {};

    this.loadEvents();
    this.loadMyRegistrations();
    this.loadMockData();
  }

  ngOnDestroy() {
    this.navSub?.unsubscribe();
  }

  // ─── UI CONTROLS ────────────────────────────────────────────────────────────

  setView(view: string) { this.currentView.set(view); }
  setTab(tab: string)   { this.activeTab.set(tab);    }

  toggleSidebar()       { this.sidebarCollapsed    = !this.sidebarCollapsed;    }
  toggleMobileSidebar() { this.mobileSidebarOpen   = !this.mobileSidebarOpen;   }
  closeMobileSidebar()  { this.mobileSidebarOpen   = false;                     }

  // ─── USER HELPERS ───────────────────────────────────────────────────────────

  getInitial(): string {
    return this.getFullName()?.charAt(0)?.toUpperCase() || 'U';
  }

  // ✅ FIX: read `fullName` (the actual UserData field), not `name`
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
        const list     = Array.isArray(data) ? data : data?.events || [];
        this.events    = list;
        this.filterEvents();
      },
      error: () => {
        this.events        = [];
        this.filteredEvents = [];
      }
    });
  }

  loadMyRegistrations() {
    this.eventService.getMyRegistrations().subscribe({
      next: (data: any) => {
        const list              = Array.isArray(data) ? data : data?.events || [];
        this.registeredEvents   = list;
        this.registeredEventIds = new Set(list.map((ev: any) => String(ev?._id || ev?.id)));
      },
      error: () => {
        this.registeredEvents   = [];
        this.registeredEventIds = new Set();
      }
    });
  }

  loadMockData() {
    this.notifications = [
      { id: 1, icon: '📅', title: 'Tech Fest Registration Open',  message: 'Slots filling fast',              time: '2h ago', read: false },
      { id: 2, icon: '✅', title: 'Registration Confirmed',       message: 'You registered for Cultural Night', time: '1d ago', read: true  }
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
    if (this.statusFilter   !== 'all') list = list.filter((e: any) => e.status   === this.statusFilter);

    this.filteredEvents = list;
  }

  onSearchChange() { this.filterEvents(); }
  onFilterChange() { this.loadEvents();   }

  // ─── EVENT UTILITIES ────────────────────────────────────────────────────────

  isRegistered(ev: any): boolean {
    return this.registeredEventIds.has(String(ev._id || ev.id));
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
      upcoming:   this.registeredEvents.filter((e: any) => e.status === 'upcoming').length,
      completed:  this.registeredEvents.filter((e: any) => e.status === 'completed').length
    };
  }

  getTrendingEvents()   { return this.events.slice(0, 4); }

  getUpcomingSchedule() {
    return this.registeredEvents
      .filter((e: any) => e.status === 'upcoming')
      .sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
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
    const id      = this.selectedEvent._id || this.selectedEvent.id;
    this.registering = true;

    this.eventService.registerForEvent(id).subscribe({
      next: () => {
        this.registeredEventIds.add(String(id));
        this.registering = false;
        this.loadMyRegistrations();
        this.closeEventModal();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Registration failed.';
        this.registering  = false;
      }
    });
  }

  cancelRegistration(ev: any) {
    const id = ev._id || ev.id;
    this.eventService.unregisterFromEvent(id).subscribe({
      next: () => {
        this.registeredEventIds.delete(String(id));
        this.registeredEvents = this.registeredEvents.filter(e => e !== ev);
        this.loadEvents();
      },
      error: (err: any) => {
        this.errorMessage = err?.error?.message || 'Could not cancel registration.';
      }
    });
  }

  cancelFromModal() {
    if (!this.selectedEvent) return;
    this.cancelRegistration(this.selectedEvent);
    this.closeEventModal();
  }

  openEventModal(event: any)  { this.selectedEvent = event; this.showEventModal = true;  }
  closeEventModal()           { this.showEventModal = false; this.selectedEvent = null;  }

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