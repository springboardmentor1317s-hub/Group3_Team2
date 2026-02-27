import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { EventService, Event } from '../../services/event.service'; // Add EventService

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

  // Statistics
  totalColleges = 25;
  totalAdmins = 25;
  totalEvents = 0; // Will be updated from API
  totalUsers = 1250;
  pendingApprovals = 8;
  activeColleges = 23;
  suspendedColleges = 2;

  // Events Data - from database
  events: any[] = []; // Will be filled from API
  filteredEvents: any[] = [];

  // Colleges Data
  colleges = [
    { id: 1, name: 'University of Technology', adminName: 'Dr. Sarah Johnson', adminEmail: 'sarah.j@tech.edu', eventCount: 45, studentCount: 3200, status: 'active', createdAt: new Date('2023-01-15') },
    { id: 2, name: 'State Engineering College', adminName: 'Prof. Michael Chen', adminEmail: 'm.chen@sec.edu', eventCount: 32, studentCount: 2800, status: 'active', createdAt: new Date('2023-02-20') },
    { id: 3, name: 'National Institute of Science', adminName: 'Dr. Priya Sharma', adminEmail: 'priya@nis.ac.in', eventCount: 28, studentCount: 2100, status: 'active', createdAt: new Date('2023-03-10') },
    { id: 4, name: 'City Arts College', adminName: 'Prof. James Wilson', adminEmail: 'j.wilson@cityarts.edu', eventCount: 18, studentCount: 950, status: 'suspended', createdAt: new Date('2023-04-05') },
    { id: 5, name: 'Business School of Excellence', adminName: 'Dr. Robert Brown', adminEmail: 'r.brown@bse.edu', eventCount: 24, studentCount: 1450, status: 'active', createdAt: new Date('2023-05-12') },
    { id: 6, name: 'Medical College', adminName: 'Dr. Emily White', adminEmail: 'e.white@medcollege.edu', eventCount: 15, studentCount: 850, status: 'pending', createdAt: new Date('2024-01-20') },
    { id: 7, name: 'Law University', adminName: 'Prof. David Miller', adminEmail: 'd.miller@lawuni.edu', eventCount: 12, studentCount: 720, status: 'active', createdAt: new Date('2023-06-18') },
    { id: 8, name: 'Design Institute', adminName: 'Lisa Anderson', adminEmail: 'l.anderson@design.edu', eventCount: 20, studentCount: 620, status: 'suspended', createdAt: new Date('2023-07-22') },
  ];

  recentColleges = this.colleges.slice(0, 4);

  // Admins Data
  admins = [
    { id: 1, name: 'Dr. Sarah Johnson', email: 'sarah.j@tech.edu', college: 'University of Technology', status: 'active', lastLogin: new Date('2024-02-20'), eventsManaged: 45 },
    { id: 2, name: 'Prof. Michael Chen', email: 'm.chen@sec.edu', college: 'State Engineering College', status: 'active', lastLogin: new Date('2024-02-19'), eventsManaged: 32 },
    { id: 3, name: 'Dr. Priya Sharma', email: 'priya@nis.ac.in', college: 'National Institute of Science', status: 'active', lastLogin: new Date('2024-02-18'), eventsManaged: 28 },
    { id: 4, name: 'Prof. James Wilson', email: 'j.wilson@cityarts.edu', college: 'City Arts College', status: 'suspended', lastLogin: new Date('2024-02-15'), eventsManaged: 18 },
    { id: 5, name: 'Dr. Robert Brown', email: 'r.brown@bse.edu', college: 'Business School of Excellence', status: 'active', lastLogin: new Date('2024-02-21'), eventsManaged: 24 },
    { id: 6, name: 'Dr. Emily White', email: 'e.white@medcollege.edu', college: 'Medical College', status: 'pending', lastLogin: new Date('2024-02-10'), eventsManaged: 0 },
  ];

  // Users Data
  users = [
    { id: 1, name: 'John Student', email: 'john@student.edu', college: 'University of Technology', role: 'student', registeredEvents: 3, joinedDate: new Date('2023-08-15') },
    { id: 2, name: 'Jane Attendee', email: 'jane@student.edu', college: 'State Engineering College', role: 'student', registeredEvents: 5, joinedDate: new Date('2023-09-20') },
    { id: 3, name: 'Bob Participant', email: 'bob@student.edu', college: 'National Institute of Science', role: 'student', registeredEvents: 2, joinedDate: new Date('2023-10-05') },
    { id: 4, name: 'Alice Walker', email: 'alice@student.edu', college: 'City Arts College', role: 'student', registeredEvents: 1, joinedDate: new Date('2023-11-12') },
  ];

  constructor(
    public authService: AuthService,
    private router: Router,
    private eventService: EventService // Add EventService
  ) {}

  ngOnInit() {
    const role = this.authService.getRole();
    if (!this.authService.isLoggedIn() || role !== 'superadmin') {
      this.router.navigate(['/login']);
      return;
    }
    
    // Load events from database
    this.loadEventsFromDB();
  }

  // Load all events from database
  loadEventsFromDB(): void {
  console.log('🔍 Super Admin: Loading events from database...');
  console.log('🔍 API URL:', this.eventService['apiUrl']); // Check the API URL
  
  this.eventService.getAllEvents().subscribe({
    next: (events) => {
      console.log('✅ Super Admin: Events loaded successfully!');
      console.log('📊 Number of events:', events.length);
      console.log('📋 Event data:', events);
      
      if (events && events.length > 0) {
        this.events = events;
        this.filteredEvents = events;
        this.totalEvents = events.length;
        console.log('✅ Events assigned to component:', this.events.length);
      } else {
        console.log('⚠️ No events returned from API');
        this.events = [];
        this.filteredEvents = [];
        this.totalEvents = 0;
      }
    },
    error: (err) => {
      console.error('❌ Super Admin: Error loading events:', err);
      console.error('❌ Error details:', err.message);
      console.error('❌ Error status:', err.status);
      this.events = [];
      this.filteredEvents = [];
    }
  });
}

  setView(view: 'overview' | 'colleges' | 'admins' | 'events' | 'users' | 'reports' | 'settings') {
    this.currentView.set(view);
    // Refresh events when switching to events view
    if (view === 'events') {
      this.loadEventsFromDB();
    }
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // Filter events by college
  filterEventsByCollege(collegeId: string) {
    if (collegeId === 'all') {
      this.filteredEvents = this.events;
    } else {
      this.filteredEvents = this.events.filter(event => 
        event.collegeId === collegeId || event.organizer?.includes(collegeId)
      );
    }
  }

  // ========== HELPER METHODS FOR TEMPLATE ==========
  
  getActiveAdminsCount(): number {
    return this.admins.filter(a => a.status === 'active').length;
  }

  getUpcomingEventsCount(): number {
    return this.events.filter(e => e.status === 'upcoming').length;
  }

  getPendingColleges(): any[] {
    return this.colleges.filter(c => c.status === 'pending');
  }

  // ========== COLLEGE MANAGEMENT METHODS ==========
  
  addCollege() {
    alert('Add College functionality - Form to add new college');
  }

  editCollege(id: number) {
    alert(`Edit college with ID: ${id}`);
  }

  viewCollege(id: number) {
    alert(`View college details for ID: ${id}`);
  }

  suspendCollege(id: number) {
    if (confirm('Are you sure you want to suspend this college?')) {
      alert(`College ${id} suspended`);
    }
  }

  activateCollege(id: number) {
    if (confirm('Are you sure you want to activate this college?')) {
      alert(`College ${id} activated`);
    }
  }

  deleteCollege(id: number) {
    if (confirm('Are you sure you want to permanently delete this college? This action cannot be undone.')) {
      alert(`College ${id} deleted`);
    }
  }

  approveCollege(id: number) {
    alert(`College ${id} approved`);
  }

  // ========== ADMIN MANAGEMENT METHODS ==========
  
  addAdmin() {
    alert('Add Admin functionality - Form to add new college admin');
  }

  editAdmin(id: number) {
    alert(`Edit admin with ID: ${id}`);
  }

  resetAdminPassword(id: number) {
    if (confirm('Reset password for this admin?')) {
      alert(`Password reset for admin ${id}`);
    }
  }

  suspendAdmin(id: number) {
    if (confirm('Suspend this admin?')) {
      alert(`Admin ${id} suspended`);
    }
  }

  activateAdmin(id: number) {
    alert(`Admin ${id} activated`);
  }

  // ========== EVENT MANAGEMENT METHODS ==========
  
  viewEvent(id: string) {
    alert(`View event details for ID: ${id}`);
  }

  cancelEvent(id: string) {
    if (confirm('Cancel this event?')) {
      alert(`Event ${id} cancelled`);
      // TODO: Call API to update event status
    }
  }

  // ========== USER MANAGEMENT METHODS ==========
  
  viewUser(id: number) {
    alert(`View user details for ID: ${id}`);
  }

  suspendUser(id: number) {
    if (confirm('Suspend this user?')) {
      alert(`User ${id} suspended`);
    }
  }

  // ========== REPORT METHODS ==========
  
  generateReport(type: string) {
    alert(`Generating ${type} report...`);
  }

  exportData(type: string) {
    alert(`Exporting ${type} data...`);
  }

  // ========== SETTINGS METHODS ==========
  
  saveSettings() {
    alert('Settings saved successfully');
  }

  // ========== HELPER METHODS ==========
  
  formatDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }

  getStatusClass(status: string): string {
    switch(status) {
      case 'active': return 'status-active';
      case 'inactive': return 'status-inactive';
      case 'suspended': return 'status-suspended';
      case 'pending': return 'status-pending';
      case 'upcoming': return 'status-upcoming';
      case 'ongoing': return 'status-ongoing';
      case 'completed': return 'status-completed';
      default: return '';
    }
  }
}