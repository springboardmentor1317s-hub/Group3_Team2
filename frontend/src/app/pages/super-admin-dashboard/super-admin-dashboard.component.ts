import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { ChatService } from '../../services/chat.service';

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css']
})
export class SuperAdminDashboardComponent implements OnInit {
  currentView = signal<'overview' | 'colleges' | 'admins' | 'events' | 'users' | 'reports' | 'settings'>('overview');
  currentDate = new Date();
  isLoading = false;

  // Stats
  totalColleges = 0;
  totalAdmins = 0;
  totalEvents = 0;
  totalUsers = 0;
  pendingApprovals = 0;
  activeColleges = 0;
  suspendedColleges = 0;

  // Events
  events: any[] = [];
  filteredEvents: any[] = [];
  eventSearchTerm = '';
  eventStatusFilter = 'all';
  eventTypeFilter = 'all';
  startDateFilter = '';
  endDateFilter = '';
  eventsLoading = false;

  // Mock data for now - replace with actual API calls when backend is ready
  colleges: any[] = [];
  filteredColleges: any[] = [];
  recentColleges: any[] = [];
  collegeSearchTerm = '';
  collegeStatusFilter = 'all';
  collegesLoading = false;

  admins: any[] = [];
  filteredAdmins: any[] = [];
  adminSearchTerm = '';
  adminStatusFilter = 'all';
  adminsLoading = false;

  users: any[] = [];
  filteredUsers: any[] = [];
  userSearchTerm = '';
  usersLoading = false;

  constructor(
    public authService: AuthService,
    private router: Router,
    private eventService: EventService,
    private chatService: ChatService
  ) {
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;
      if (req === 'SA_VIEW_COLLEGES') { this.setView('colleges'); }
      if (req === 'SA_VIEW_ADMINS') { this.setView('admins'); }
      if (req === 'SA_VIEW_EVENTS') { this.setView('events'); this.loadEvents(); }
      if (req === 'SA_VIEW_REPORTS') { this.setView('reports'); }
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('superadmin')) {
      this.authService.logout();
      this.router.navigate(['/login']);
      return;
    }
    this.loadDashboardData();
  }

  loadDashboardData() {
    this.loadStats();
    this.loadEvents();
    this.loadMockColleges();
    this.loadMockAdmins();
    this.loadMockUsers();
  }

  loadStats() {
    this.eventService.getStats().subscribe({
      next: (stats: any) => {
        this.totalEvents = stats.totalEvents || 0;
        this.totalAdmins = stats.totalAdmins || 0;
        this.totalUsers = stats.totalStudents || 0;
        this.totalColleges = stats.totalColleges || 0;
        this.activeColleges = stats.activeColleges || 0;
        this.suspendedColleges = stats.suspendedColleges || 0;
        this.pendingApprovals = stats.pendingApprovals || 0;
      },
      error: (err) => console.error('Stats error:', err)
    });
  }

  // Temporary mock data until backend APIs are ready
  loadMockColleges() {
    this.collegesLoading = true;
    // Simulate API call
    setTimeout(() => {
      this.colleges = [
        { id: 1, name: 'IIT Madras', adminName: 'Dr. Rajesh Kumar', adminEmail: 'rajesh@iitm.ac.in', eventCount: 24, studentCount: 850, status: 'active', createdAt: new Date('2023-01-15') },
        { id: 2, name: 'NIT Trichy', adminName: 'Prof. Sunita Sharma', adminEmail: 'sunita@nitt.edu', eventCount: 18, studentCount: 620, status: 'active', createdAt: new Date('2023-02-20') },
        { id: 3, name: 'BITS Pilani', adminName: 'Dr. Vikram Singh', adminEmail: 'vikram@bits-pilani.ac.in', eventCount: 22, studentCount: 780, status: 'active', createdAt: new Date('2023-01-10') },
      ];
      this.recentColleges = this.colleges.slice(0, 3);
      this.filteredColleges = [...this.colleges];
      this.collegesLoading = false;
    }, 500);
  }

  loadMockAdmins() {
    this.adminsLoading = true;
    setTimeout(() => {
      this.admins = [
        { id: 1, name: 'Dr. Rajesh Kumar', email: 'rajesh@iitm.ac.in', college: 'IIT Madras', status: 'active', lastLogin: new Date('2024-03-15'), eventsManaged: 24 },
        { id: 2, name: 'Prof. Sunita Sharma', email: 'sunita@nitt.edu', college: 'NIT Trichy', status: 'active', lastLogin: new Date('2024-03-14'), eventsManaged: 18 },
      ];
      this.filteredAdmins = [...this.admins];
      this.adminsLoading = false;
    }, 500);
  }

  loadMockUsers() {
    this.usersLoading = true;
    setTimeout(() => {
      this.users = [
        { id: 1, name: 'Arjun Kumar', email: 'arjun@student.edu', college: 'IIT Madras', role: 'student', registeredEvents: 3, joinedDate: new Date('2023-08-15') },
        { id: 2, name: 'Priya Sharma', email: 'priya@student.edu', college: 'NIT Trichy', role: 'student', registeredEvents: 5, joinedDate: new Date('2023-09-20') },
      ];
      this.filteredUsers = [...this.users];
      this.usersLoading = false;
    }, 500);
  }

  // Events
  loadEvents() {
    this.eventsLoading = true;
    const filters: any = {};
    if (this.startDateFilter) filters.startDate = this.startDateFilter;
    if (this.endDateFilter) filters.endDate = this.endDateFilter;
    if (this.eventStatusFilter !== 'all') filters.status = this.eventStatusFilter;
    if (this.eventTypeFilter !== 'all') filters.type = this.eventTypeFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (events: any) => {
        const list = Array.isArray(events) ? events : events?.events || [];
        this.events = list;
        this.applyEventSearch();
        this.eventsLoading = false;
      },
      error: (err) => {
        console.error('Events error:', err);
        this.events = [];
        this.filteredEvents = [];
        this.eventsLoading = false;
      }
    });
  }

  applyEventSearch() {
    const term = this.eventSearchTerm.toLowerCase().trim();
    this.filteredEvents = this.events.filter(e =>
      !term ||
      e.title?.toLowerCase().includes(term) ||
      e.organizer?.toLowerCase().includes(term) ||
      e.venue?.toLowerCase().includes(term)
    );
  }

  onEventFilterChange() { this.loadEvents(); }
  onEventSearch() { this.applyEventSearch(); }
  
  clearEventFilters() {
    this.eventSearchTerm = '';
    this.eventStatusFilter = 'all';
    this.eventTypeFilter = 'all';
    this.startDateFilter = '';
    this.endDateFilter = '';
    this.loadEvents();
  }

  // College filters
  applyCollegeFilters() {
    const term = this.collegeSearchTerm.toLowerCase().trim();
    this.filteredColleges = this.colleges.filter(c => {
      const matchSearch = !term ||
        c.name?.toLowerCase().includes(term) ||
        c.adminName?.toLowerCase().includes(term) ||
        c.adminEmail?.toLowerCase().includes(term);
      const matchStatus = this.collegeStatusFilter === 'all' || c.status === this.collegeStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  onCollegeFilterChange() { this.applyCollegeFilters(); }
  clearCollegeFilters() { this.collegeSearchTerm = ''; this.collegeStatusFilter = 'all'; this.applyCollegeFilters(); }

  // Admin filters
  applyAdminFilters() {
    const term = this.adminSearchTerm.toLowerCase().trim();
    this.filteredAdmins = this.admins.filter(a => {
      const matchSearch = !term ||
        a.name?.toLowerCase().includes(term) ||
        a.email?.toLowerCase().includes(term) ||
        a.college?.toLowerCase().includes(term);
      const matchStatus = this.adminStatusFilter === 'all' || a.status === this.adminStatusFilter;
      return matchSearch && matchStatus;
    });
  }

  onAdminFilterChange() { this.applyAdminFilters(); }
  clearAdminFilters() { this.adminSearchTerm = ''; this.adminStatusFilter = 'all'; this.applyAdminFilters(); }

  // User filters
  applyUserFilters() {
    const term = this.userSearchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(u =>
      !term ||
      u.name?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.college?.toLowerCase().includes(term)
    );
  }

  onUserSearch() { this.applyUserFilters(); }
  clearUserFilters() { this.userSearchTerm = ''; this.applyUserFilters(); }

  // View control
  setView(view: 'overview' | 'colleges' | 'admins' | 'events' | 'users' | 'reports' | 'settings') {
    this.currentView.set(view);
    if (view === 'events') this.loadEvents();
  }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }

  // Action methods (placeholder until backend APIs are ready)
  addCollege() { alert('Add College - API coming soon'); }
  viewCollege(id: number) { alert(`View college ${id}`); }
  editCollege(id: number) { alert(`Edit college ${id}`); }
  deleteCollege(id: number) { if (confirm('Delete?')) alert(`Deleted ${id}`); }
  approveCollege(id: number) { alert(`Approved ${id}`); }
  suspendCollege(id: number) { if (confirm('Suspend?')) alert(`Suspended ${id}`); }
  activateCollege(id: number) { alert(`Activated ${id}`); }

  addAdmin() { alert('Add Admin - API coming soon'); }
  editAdmin(id: number) { alert(`Edit admin ${id}`); }
  resetAdminPassword(id: number) { if (confirm('Reset password?')) alert(`Password reset for ${id}`); }
  suspendAdmin(id: number) { if (confirm('Suspend admin?')) alert(`Suspended ${id}`); }
  activateAdmin(id: number) { alert(`Activated ${id}`); }

  viewEvent(id: string) { alert(`View event ${id}`); }
  cancelEvent(id: string) { if (confirm('Cancel event?')) alert(`Cancelled ${id}`); }

  viewUser(id: number) { alert(`View user ${id}`); }
  suspendUser(id: number) { if (confirm('Suspend user?')) alert(`Suspended ${id}`); }

  generateReport(type: string) { alert(`Generating ${type} report...`); }
  exportData(type: string) { alert(`Exporting ${type} data...`); }
  saveSettings() { alert('Settings saved'); }

  // Helpers
  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'active': return 'badge-success';
      case 'suspended': return 'badge-danger';
      case 'pending': return 'badge-pending';
      case 'upcoming': return 'badge-info';
      case 'ongoing': return 'badge-success';
      case 'completed': return 'badge-secondary';
      case 'cancelled': return 'badge-danger';
      default: return 'badge-info';
    }
  }

  getActiveAdminsCount() { return this.admins.filter(a => a.status === 'active').length; }
  getUpcomingEventsCount() { return this.events.filter(e => e.status === 'upcoming').length; }
}