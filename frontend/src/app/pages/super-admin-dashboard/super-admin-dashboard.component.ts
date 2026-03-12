import { Component, OnInit, signal, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EventService } from '../../services/event.service';
import { ChatService } from '../../services/chat.service';
import { UserService } from '../../services/user.service';

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

  // Stats
  totalColleges = 0; totalAdmins = 0; totalEvents = 0; totalUsers = 0;
  pendingApprovals = 0; activeColleges = 0; suspendedColleges = 0;

  // ── Event filters ─────────────────────────────────────────────────────────
  startDateFilter = ''; endDateFilter = ''; eventStatusFilter = 'all';
  eventTypeFilter = 'all'; eventSearchTerm = '';

  // Events from DB
  events: any[] = []; filteredEvents: any[] = [];

  // ── College filters ────────────────────────────────────────────────────────
  collegeSearchTerm   = '';
  collegeStatusFilter = 'all';

  colleges: any[] = [];
  filteredColleges: any[] = [];
  recentColleges: any[] = [];

  // ── Admin filters ──────────────────────────────────────────────────────────
  adminSearchTerm   = '';
  adminStatusFilter = 'all';

  admins: any[] = [];
  filteredAdmins: any[] = [];

  // ── User filters ───────────────────────────────────────────────────────────
  userSearchTerm = '';

  users: any[] = [];
  filteredUsers: any[] = [];

  constructor(public authService: AuthService, private router: Router,
              private eventService: EventService, private chatService: ChatService,
              private userService: UserService) {
    effect(() => {
      const req = this.chatService.navRequest();
      if (!req) return;
      if (req === 'SA_VIEW_COLLEGES') { this.setView('colleges'); }
      if (req === 'SA_VIEW_ADMINS')   { this.setView('admins');   }
      if (req === 'SA_VIEW_EVENTS')   { this.setView('events');   }
      if (req === 'SA_VIEW_REPORTS')  { this.setView('reports');  }
      this.chatService.navRequest.set(null);
    });
  }

  ngOnInit() {
    if (!this.authService.isLoggedIn() || !this.authService.isAuthorized('superadmin')) {
      this.authService.logout(); this.router.navigate(['/login']); return;
    }
    this.loadEventsFromDB();
    this.loadStats();
    this.loadUsers();
    this.loadAdmins();
    this.loadColleges();
  }

  // ── STATS ──────────────────────────────────────────────────────────────────
  loadStats() {
    this.eventService.getStats().subscribe({
      next: (stats) => {
        this.totalEvents  = stats.totalEvents;
        this.totalAdmins  = stats.totalAdmins;
        this.totalUsers   = stats.totalStudents;
        // Total colleges updated via loadColleges() 
      },
      error: (err) => console.error('Stats error:', err)
    });
  }

  loadUsers() {
    this.userService.getAllUsers().subscribe({
      next: (users) => {
        // Map fullName -> name so the HTML doesn't break
        this.users = users.map(u => ({...u, name: u.fullName, joinedDate: u.createdAt }));
        this.filteredUsers = [...this.users];
      },
      error: (err) => console.error('Error fetching users:', err)
    });
  }

  loadAdmins() {
    this.userService.getAllAdmins().subscribe({
      next: (admins) => {
        this.admins = admins.map(a => ({...a, name: a.fullName }));
        this.filteredAdmins = [...this.admins];
      },
      error: (err) => console.error('Error fetching admins:', err)
    });
  }

  loadColleges() {
    this.userService.getColleges().subscribe({
      next: (colleges) => {
        this.colleges = colleges;
        this.filteredColleges = [...this.colleges];
        this.recentColleges = this.colleges.slice(0, 4);

        this.totalColleges = colleges.length;
        this.activeColleges = colleges.filter(c => c.status === 'active').length;
        this.suspendedColleges = colleges.filter(c => c.status === 'suspended').length;
      },
      error: (err) => console.error('Error fetching colleges:', err)
    });
  }

  getActiveAdminsCount()   { return this.admins.filter(a => a.status === 'active').length; }
  getUpcomingEventsCount() { return this.events.filter(e => e.status === 'upcoming').length; }

  // ── EVENTS ─────────────────────────────────────────────────────────────────
  loadEventsFromDB() {
    const filters: any = {};
    if (this.startDateFilter)              filters.startDate = this.startDateFilter;
    if (this.endDateFilter)                filters.endDate   = this.endDateFilter;
    if (this.eventStatusFilter !== 'all')  filters.status    = this.eventStatusFilter;
    if (this.eventTypeFilter   !== 'all')  filters.type      = this.eventTypeFilter;

    this.eventService.getAllEvents(filters).subscribe({
      next: (events) => {
        this.events = events;
        this.applyEventSearch();
        this.totalEvents = events.length;
      },
      error: (err) => console.error('Events error:', err)
    });
  }

  applyEventSearch() {
    const term = this.eventSearchTerm.toLowerCase().trim();
    this.filteredEvents = this.events.filter(e =>
      !term || e.title?.toLowerCase().includes(term) ||
               e.organizer?.toLowerCase().includes(term) ||
               e.venue?.toLowerCase().includes(term)
    );
  }

  onEventFilterChange() { this.loadEventsFromDB(); }
  onEventSearch()       { this.applyEventSearch(); }

  clearEventFilters() {
    this.eventSearchTerm = ''; this.eventStatusFilter = 'all';
    this.eventTypeFilter = 'all'; this.startDateFilter = ''; this.endDateFilter = '';
    this.loadEventsFromDB();
  }

  setView(view: 'overview' | 'colleges' | 'admins' | 'events' | 'users' | 'reports' | 'settings') {
    this.currentView.set(view);
    if (view === 'events') this.loadEventsFromDB();
  }

  logout() { this.authService.logout(); this.router.navigate(['/login']); }

  // ── COLLEGE FILTERS ────────────────────────────────────────────────────────
  applyCollegeFilters() {
    const term = this.collegeSearchTerm.toLowerCase().trim();
    this.filteredColleges = this.colleges.filter(c => {
      const matchSearch = !term ||
        c.name.toLowerCase().includes(term) ||
        c.adminName.toLowerCase().includes(term) ||
        c.adminEmail.toLowerCase().includes(term);
      const matchStatus = this.collegeStatusFilter === 'all' || c.status === this.collegeStatusFilter;
      return matchSearch && matchStatus;
    });
  }
  onCollegeFilterChange() { this.applyCollegeFilters(); }
  clearCollegeFilters()   { this.collegeSearchTerm = ''; this.collegeStatusFilter = 'all'; this.applyCollegeFilters(); }

  // ── ADMIN FILTERS ──────────────────────────────────────────────────────────
  applyAdminFilters() {
    const term = this.adminSearchTerm.toLowerCase().trim();
    this.filteredAdmins = this.admins.filter(a => {
      const matchSearch = !term ||
        a.name.toLowerCase().includes(term) ||
        a.email.toLowerCase().includes(term) ||
        a.college.toLowerCase().includes(term);
      const matchStatus = this.adminStatusFilter === 'all' || a.status === this.adminStatusFilter;
      return matchSearch && matchStatus;
    });
  }
  onAdminFilterChange() { this.applyAdminFilters(); }
  clearAdminFilters()   { this.adminSearchTerm = ''; this.adminStatusFilter = 'all'; this.applyAdminFilters(); }

  // ── USER FILTERS ───────────────────────────────────────────────────────────
  applyUserFilters() {
    const term = this.userSearchTerm.toLowerCase().trim();
    this.filteredUsers = this.users.filter(u =>
      !term || u.name.toLowerCase().includes(term) ||
               u.email.toLowerCase().includes(term) ||
               u.college.toLowerCase().includes(term)
    );
  }
  onUserSearch()    { this.applyUserFilters(); }
  clearUserFilters(){ this.userSearchTerm = ''; this.applyUserFilters(); }

  // ── COLLEGE MANAGEMENT ─────────────────────────────────────────────────────
  addCollege()              { alert('Add College — coming soon'); }
  viewCollege(id: number)   { alert(`Viewing college ID: ${id}`); }
  editCollege(id: number)   { alert(`Editing college ID: ${id}`); }
  deleteCollege(id: number) { if (confirm('Delete this college?')) alert(`College ${id} deleted`); }
  approveCollege(id: number)  { alert(`College ${id} approved`); }
  suspendCollege(id: number)  { if (confirm('Suspend this college?')) alert(`College ${id} suspended`); }
  activateCollege(id: number) { alert(`College ${id} activated`); }

  // ── ADMIN MANAGEMENT ───────────────────────────────────────────────────────
  addAdmin()                   { alert('Add Admin — coming soon'); }
  editAdmin(id: number)        { alert(`Editing admin ID: ${id}`); }
  resetAdminPassword(id:number){ if (confirm('Reset password?')) alert(`Password reset for admin ${id}`); }
  suspendAdmin(id: number)     { if (confirm('Suspend this admin?')) alert(`Admin ${id} suspended`); }
  activateAdmin(id: number)    { alert(`Admin ${id} activated`); }

  // ── EVENT MANAGEMENT ───────────────────────────────────────────────────────
  viewEvent(id: string) { alert(`Viewing event: ${id}`); }
  cancelEvent(id: string) {
    if (confirm('Cancel this event?')) {
      this.eventService.updateEvent(id, { status: 'cancelled' }).subscribe({
        next:  () => this.loadEventsFromDB(),
        error: err => alert(err.error?.message || 'Cannot cancel event')
      });
    }
  }

  // ── USER MANAGEMENT ────────────────────────────────────────────────────────
  viewUser(id: number)    { alert(`Viewing user ID: ${id}`); }
  suspendUser(id: number) { if (confirm('Suspend this user?')) alert(`User ${id} suspended`); }

  // ── REPORTS ── (real CSV downloads) ────────────────────────────────────────
  generateReport(type: string) {
    switch (type) {
      case 'monthly':   this.exportMonthlyReport(); break;
      case 'college':   this.exportCollegeReport(); break;
      case 'user':      this.exportUserReport();    break;
      case 'financial': this.exportFinancialReport(); break;
      default: alert(`Generating ${type} report…`);
    }
  }

  exportData(type: string) {
    switch (type) {
      case 'all':    this.exportAllDataCSV(); break;
      case 'events': this.exportEventsCSV(); break;
      default: alert(`Exporting ${type} data…`);
    }
  }

  private exportMonthlyReport() {
    const now   = new Date();
    const month = now.getMonth();
    const year  = now.getFullYear();
    const thisMonth = this.events.filter(e => {
      const d = new Date(e.startDate);
      return d.getMonth() === month && d.getFullYear() === year;
    });
    const rows = [
      ['Monthly Activity Report — ' + now.toLocaleString('default', { month: 'long', year: 'numeric' })],
      [],
      ['Event', 'Type', 'Venue', 'Date', 'Participants', 'Capacity', 'Status'],
      ...thisMonth.map(e => [
        `"${e.title}"`, e.type, `"${e.venue}"`, this.formatDate(e.startDate),
        e.currentParticipants || 0, e.maxParticipants, e.status
      ]),
      [],
      [`Total Events This Month: ${thisMonth.length}`],
      [`Total Registrations: ${thisMonth.reduce((s: number, e: any) => s + (e.currentParticipants || 0), 0)}`]
    ];
    this.downloadCSV(rows, 'monthly-activity-report');
  }

  private exportCollegeReport() {
    const rows = [
      ['College Performance Report'],
      [],
      ['College', 'Admin', 'Email', 'Events', 'Students', 'Status', 'Joined'],
      ...this.colleges.map(c => [
        `"${c.name}"`, `"${c.adminName}"`, c.adminEmail,
        c.eventCount, c.studentCount, c.status, this.formatDate(c.createdAt)
      ]),
      [],
      [`Total Colleges: ${this.colleges.length}`],
      [`Active: ${this.colleges.filter(c => c.status === 'active').length}`],
      [`Suspended: ${this.colleges.filter(c => c.status === 'suspended').length}`]
    ];
    this.downloadCSV(rows, 'college-performance-report');
  }

  private exportUserReport() {
    const rows = [
      ['User Engagement Report'],
      [],
      ['Name', 'Email', 'College', 'Role', 'Events Registered', 'Joined Date'],
      ...this.users.map(u => [
        `"${u.name}"`, u.email, `"${u.college}"`, u.role, u.registeredEvents, this.formatDate(u.joinedDate)
      ]),
      [],
      [`Total Users: ${this.users.length}`],
      [`Total Registrations: ${this.users.reduce((s, u) => s + u.registeredEvents, 0)}`]
    ];
    this.downloadCSV(rows, 'user-engagement-report');
  }

  private exportFinancialReport() {
    const paidEvents = this.events.filter(e => e.registrationFee > 0);
    const rows = [
      ['Financial Summary Report'],
      [],
      ['Event', 'Type', 'Fee (INR)', 'Participants', 'Revenue (INR)', 'Status'],
      ...paidEvents.map(e => {
        const rev = (e.registrationFee || 0) * (e.currentParticipants || 0);
        return [`"${e.title}"`, e.type, e.registrationFee, e.currentParticipants || 0, rev, e.status];
      }),
      [],
      [`Total Paid Events: ${paidEvents.length}`],
      [`Estimated Total Revenue: ₹${paidEvents.reduce((s, e) => s + (e.registrationFee || 0) * (e.currentParticipants || 0), 0)}`]
    ];
    this.downloadCSV(rows, 'financial-summary-report');
  }

  private exportEventsCSV() {
    const rows = [
      ['Title', 'Type', 'Category', 'Venue', 'Organizer', 'Start Date', 'End Date', 'Registrations', 'Capacity', 'Fee', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`, e.type, e.category, `"${e.venue}"`, `"${e.organizer}"`,
        this.formatDate(e.startDate), this.formatDate(e.endDate),
        e.currentParticipants || 0, e.maxParticipants,
        e.registrationFee > 0 ? e.registrationFee : 'Free', e.status
      ])
    ];
    this.downloadCSV(rows, 'all-events-export');
  }

  private exportAllDataCSV() {
    const rows = [
      ['=== PLATFORM SUMMARY ==='],
      [`Total Colleges: ${this.totalColleges}`, `Total Admins: ${this.totalAdmins}`,
       `Total Events: ${this.totalEvents}`, `Total Students: ${this.totalUsers}`],
      [],
      ['=== COLLEGES ==='],
      ['Name', 'Admin', 'Events', 'Students', 'Status'],
      ...this.colleges.map(c => [`"${c.name}"`, `"${c.adminName}"`, c.eventCount, c.studentCount, c.status]),
      [],
      ['=== EVENTS ==='],
      ['Title', 'Type', 'Venue', 'Date', 'Participants', 'Status'],
      ...this.events.map(e => [
        `"${e.title}"`, e.type, `"${e.venue}"`, this.formatDate(e.startDate),
        e.currentParticipants || 0, e.status
      ])
    ];
    this.downloadCSV(rows, 'platform-full-export');
  }

  private downloadCSV(rows: any[][], filename: string) {
    const csv  = rows.map(r => (Array.isArray(r) ? r.join(',') : r)).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`; a.click();
    URL.revokeObjectURL(url);
  }

  // ── SETTINGS ───────────────────────────────────────────────────────────────
  saveSettings() { alert('Settings saved successfully'); }

  // ── HELPERS ────────────────────────────────────────────────────────────────
  formatDate(date: any): string {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
  }

  getStatusClass(status: string): string {
    switch (status) {
      case 'active':    return 'badge-success';
      case 'inactive':  return 'badge-secondary';
      case 'suspended': return 'badge-danger';
      case 'pending':   return 'badge-pending';
      case 'upcoming':  return 'badge-info';
      case 'ongoing':   return 'badge-success';
      case 'completed': return 'badge-secondary';
      case 'cancelled': return 'badge-danger';
      default:          return '';
    }
  }
}