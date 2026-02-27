import { NgClass, SlicePipe } from '@angular/common';
import { AuthService } from '../../services/auth.service';
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { EventService, Event } from '../../services/event.service';

// ========== INTERFACES ==========
interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  college: string;
  department: string;
  year: string;
  rollNumber: string;
  phone: string;
  walletBalance: number;
  registeredEvents: string[];
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  read: boolean;
  createdAt: Date;
  eventId?: string;
}

interface Payment {
  id: string;
  eventId: string;
  eventName: string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | 'refunded';
  paymentMethod: string;
  transactionId: string;
  paymentDate: Date;
}

interface RegistrationData {
  eventId: string;
  teamName?: string;
  teamMembers?: string[];
  paymentMethod: 'wallet' | 'card' | 'upi' | string;
}

// Dashboard Event Interface
interface DashboardEvent {
  _id: string;
  title: string;
  description: string;
  type: string;
  category: string;
  venue: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxParticipants: number;
  currentParticipants: number;
  registrationFee: number;
  isPaid: boolean;
  organizer: string;
  contactEmail: string;
  status: string;
  createdBy?: string;
  registeredUsers?: string[];
  createdAt?: Date;
}

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, NgClass, SlicePipe],
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css']
})
export class StudentDashboardComponent implements OnInit {
  // ========== SIGNALS ==========
  currentView = signal<'overview' | 'events' | 'registered' | 'profile' | 'notifications' | 'payments' | 'schedule' | 'register'>('overview');
  sidebarCollapsed = signal<boolean>(false);
  showMobileMenu = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedEventType = signal<string>('all');
  selectedCategory = signal<string>('all');
  selectedEvent = signal<DashboardEvent | null>(null);
  
  registrationData = signal<RegistrationData>({
    eventId: '',
    teamName: '',
    teamMembers: [],
    paymentMethod: 'wallet'
  });
  
  // ========== USER DATA ==========
  currentUser = signal<User>({
    id: '',
    name: '',
    email: '',
    college: '',
    department: '',
    year: '',
    rollNumber: '',
    phone: '',
    walletBalance: 0,
    registeredEvents: []
  });

  // ========== EVENTS DATA FROM DATABASE ==========
  allEvents = signal<DashboardEvent[]>([]);

  // ========== MOCK DATA FOR OTHER FEATURES ==========
  notifications = signal<Notification[]>([
    {
      id: 'not001',
      title: 'Registration Successful',
      message: 'You have successfully registered for Tech Fest 2024',
      type: 'success',
      read: false,
      createdAt: new Date('2024-03-01T10:30:00'),
      eventId: 'evt001'
    },
    {
      id: 'not002',
      title: 'Payment Received',
      message: 'Your payment of ₹500 for Tech Fest 2024 has been confirmed',
      type: 'success',
      read: false,
      createdAt: new Date('2024-03-01T10:31:00'),
      eventId: 'evt001'
    },
    {
      id: 'not003',
      title: 'Event Reminder',
      message: 'Sports Meet starts tomorrow. Don\'t forget to carry your ID card',
      type: 'info',
      read: true,
      createdAt: new Date('2024-04-30T09:00:00'),
      eventId: 'evt003'
    },
    {
      id: 'not004',
      title: 'Event Cancelled',
      message: 'Cultural Night has been postponed due to unforeseen circumstances',
      type: 'warning',
      read: false,
      createdAt: new Date('2024-03-18T14:20:00'),
      eventId: 'evt002'
    }
  ]);

  payments = signal<Payment[]>([
    {
      id: 'pay001',
      eventId: 'evt001',
      eventName: 'Tech Fest 2024',
      amount: 500,
      status: 'completed',
      paymentMethod: 'Wallet',
      transactionId: 'TXN123456789',
      paymentDate: new Date('2024-03-01T10:31:00')
    },
    {
      id: 'pay002',
      eventId: 'evt003',
      eventName: 'Inter-College Sports Meet',
      amount: 300,
      status: 'completed',
      paymentMethod: 'Credit Card',
      transactionId: 'TXN987654321',
      paymentDate: new Date('2024-02-28T15:45:00')
    },
    {
      id: 'pay003',
      eventId: 'evt004',
      eventName: 'AI & ML Workshop',
      amount: 200,
      status: 'pending',
      paymentMethod: 'Wallet',
      transactionId: 'TXN456789123',
      paymentDate: new Date('2024-03-05T11:20:00')
    }
  ]);

  // ========== COMPUTED SIGNALS ==========
  registeredEvents = computed(() => {
    const userEvents = this.currentUser().registeredEvents;
    return this.allEvents().filter(event => userEvents.includes(this.getEventId(event)));
  });

  upcomingEvents = computed(() => {
    const now = new Date();
    return this.allEvents().filter(event => 
      event.status === 'upcoming' && 
      new Date(event.startDate) > now
    );
  });

  ongoingEvents = computed(() => {
    return this.allEvents().filter(event => event.status === 'ongoing');
  });

  completedEvents = computed(() => {
    return this.allEvents().filter(event => event.status === 'completed');
  });

  filteredEvents = computed(() => {
    let filtered = this.allEvents();
    
    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      filtered = filtered.filter(event => 
        event.title.toLowerCase().includes(query) ||
        event.description.toLowerCase().includes(query) ||
        event.venue.toLowerCase().includes(query)
      );
    }
    
    if (this.selectedEventType() !== 'all') {
      filtered = filtered.filter(event => event.type === this.selectedEventType());
    }
    
    if (this.selectedCategory() !== 'all') {
      filtered = filtered.filter(event => event.category === this.selectedCategory());
    }
    
    return filtered;
  });

  unreadNotifications = computed(() => {
    return this.notifications().filter(n => !n.read).length;
  });

  upcomingSchedule = computed(() => {
    const now = new Date();
    return this.registeredEvents()
      .filter(event => new Date(event.startDate) > now)
      .sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime())
      .slice(0, 5);
  });

  totalSpent = computed(() => {
    return this.payments()
      .filter(p => p.status === 'completed')
      .reduce((sum, p) => sum + p.amount, 0);
  });

  pendingPayments = computed(() => {
    return this.payments().filter(p => p.status === 'pending');
  });

  // ========== CONSTRUCTOR ==========
  constructor(
    private authService: AuthService,
    private router: Router,
    private eventService: EventService
  ) {
    effect(() => {
      console.log('Current view:', this.currentView());
    });
  }

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    try {
      if (!this.authService.isLoggedIn()) {
        this.router.navigate(['/login']);
        return;
      }
      
      const userRole = this.authService.getRole();
      if (userRole !== 'student') {
        this.router.navigate(['/login']);
        return;
      }
      
      this.loadUserData();
      this.loadEventsFromDB();
      
    } catch (error) {
      console.error('Auth check failed:', error);
      this.router.navigate(['/login']);
    }
  }

  // ========== LOAD DATA ==========
  loadUserData(): void {
    const fullName = this.authService.getFullName() || 'Student';
    const email = this.authService.getEmail() || 'student@college.edu';
    
    this.currentUser.update(user => ({
      ...user,
      id: localStorage.getItem('userId') || '1',
      name: fullName,
      email: email,
      college: 'Your College',
      department: 'Computer Science',
      year: '3rd Year',
      rollNumber: 'CS' + Math.floor(Math.random() * 10000),
      phone: '+1 234 567 8900',
      walletBalance: 2500,
      registeredEvents: []
    }));
  }

  loadEventsFromDB(): void {
    console.log('Loading events from database...');
    this.eventService.getAllEvents().subscribe({
      next: (events: any[]) => {
        console.log('Events loaded from DB:', events);
        // Map the events to ensure they have all required fields
        const dashboardEvents: DashboardEvent[] = events.map(event => ({
          _id: event._id || '',
          title: event.title || '',
          description: event.description || '',
          type: event.type || '',
          category: event.category || '',
          venue: event.venue || '',
          startDate: event.startDate ? new Date(event.startDate) : new Date(),
          endDate: event.endDate ? new Date(event.endDate) : new Date(),
          registrationDeadline: event.registrationDeadline ? new Date(event.registrationDeadline) : new Date(),
          maxParticipants: event.maxParticipants || 0,
          currentParticipants: event.currentParticipants || 0,
          registrationFee: event.registrationFee || 0,
          isPaid: event.isPaid || false,
          organizer: event.organizer || '',
          contactEmail: event.contactEmail || '',
          status: event.status || 'upcoming',
          createdBy: event.createdBy,
          registeredUsers: event.registeredUsers || [],
          createdAt: event.createdAt ? new Date(event.createdAt) : undefined
        }));
        this.allEvents.set(dashboardEvents);
      },
      error: (err) => {
        console.error('Error loading events:', err);
        this.allEvents.set([]);
      }
    });
  }

  // ========== HELPER METHODS FOR EVENT ID ==========
  getEventId(event: DashboardEvent): string {
    return event._id || '';
  }

  trackByEventId(index: number, event: DashboardEvent): string {
    return event._id || index.toString();
  }

  // ========== LOGOUT ==========
  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  // ========== UI ACTIONS ==========
  setView(view: 'overview' | 'events' | 'registered' | 'profile' | 'notifications' | 'payments' | 'schedule' | 'register'): void {
    this.currentView.set(view);
    if (view !== 'register') {
      this.selectedEvent.set(null);
    }
    this.showMobileMenu.set(false);
  }

  toggleSidebar(): void {
    this.sidebarCollapsed.update(value => !value);
  }

  toggleMobileMenu(): void {
    this.showMobileMenu.update(value => !value);
  }

  // ========== SEARCH & FILTERS ==========
  onSearchInput(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.searchQuery.set(input.value);
    }
  }

  onEventTypeChange(event: any): void {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.selectedEventType.set(select.value);
    }
  }

  onCategoryChange(event: any): void {
    const select = event.target as HTMLSelectElement;
    if (select) {
      this.selectedCategory.set(select.value);
    }
  }

  resetFilters(): void {
    this.searchQuery.set('');
    this.selectedEventType.set('all');
    this.selectedCategory.set('all');
  }

  // ========== EVENT REGISTRATION ==========
  selectEventForRegistration(event: DashboardEvent): void {
    this.selectedEvent.set(event);
    this.registrationData.update(data => ({
      ...data,
      eventId: this.getEventId(event),
      teamName: '',
      teamMembers: [],
      paymentMethod: 'wallet'
    }));
    this.setView('register');
  }

  registerForEvent(): void {
    const event = this.selectedEvent();
    if (!event) return;

    const eventId = this.getEventId(event);

    if (this.currentUser().registeredEvents.includes(eventId)) {
      alert('You are already registered for this event!');
      return;
    }

    if (event.currentParticipants >= event.maxParticipants) {
      alert('Registration is full for this event!');
      return;
    }

    if (event.isPaid && event.registrationFee > 0) {
      const paymentMethod = this.registrationData().paymentMethod;
      if (paymentMethod === 'wallet') {
        if (this.currentUser().walletBalance < event.registrationFee) {
          alert('Insufficient wallet balance! Please add funds or use another payment method.');
          return;
        }
        this.currentUser.update(user => ({
          ...user,
          walletBalance: user.walletBalance - event.registrationFee
        }));
      }
    }

    this.currentUser.update(user => ({
      ...user,
      registeredEvents: [...user.registeredEvents, eventId]
    }));

    this.allEvents.update(events => 
      events.map(e => 
        this.getEventId(e) === eventId 
          ? { ...e, currentParticipants: e.currentParticipants + 1 }
          : e
      )
    );

    const newNotification: Notification = {
      id: 'not' + Date.now(),
      title: 'Registration Successful',
      message: `You have successfully registered for ${event.title}`,
      type: 'success',
      read: false,
      createdAt: new Date(),
      eventId: eventId
    };

    this.notifications.update(n => [newNotification, ...n]);

    if (event.isPaid && event.registrationFee > 0) {
      const newPayment: Payment = {
        id: 'pay' + Date.now(),
        eventId: eventId,
        eventName: event.title,
        amount: event.registrationFee,
        status: 'completed',
        paymentMethod: this.registrationData().paymentMethod === 'wallet' ? 'Wallet' : 
                      this.registrationData().paymentMethod === 'card' ? 'Credit Card' : 'UPI',
        transactionId: 'TXN' + Math.random().toString(36).substring(2, 10).toUpperCase(),
        paymentDate: new Date()
      };
      this.payments.update(p => [newPayment, ...p]);
    }

    alert(`Successfully registered for ${event.title}!`);
    this.setView('registered');
  }

  cancelRegistration(eventId: string): void {
    if (confirm('Are you sure you want to cancel this registration?')) {
      this.currentUser.update(user => ({
        ...user,
        registeredEvents: user.registeredEvents.filter(id => id !== eventId)
      }));

      this.allEvents.update(events =>
        events.map(e =>
          this.getEventId(e) === eventId
            ? { ...e, currentParticipants: e.currentParticipants - 1 }
            : e
        )
      );

      const event = this.allEvents().find(e => this.getEventId(e) === eventId);
      if (event) {
        const notification: Notification = {
          id: 'not' + Date.now(),
          title: 'Registration Cancelled',
          message: `Your registration for ${event.title} has been cancelled`,
          type: 'warning',
          read: false,
          createdAt: new Date(),
          eventId: eventId
        };
        this.notifications.update(n => [notification, ...n]);
      }

      alert('Registration cancelled successfully!');
    }
  }

  // ========== TEAM DETAILS ==========
  onTeamNameInput(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      this.registrationData.update(data => ({
        ...data,
        teamName: input.value
      }));
    }
  }

  onTeamMembersInput(event: any): void {
    const input = event.target as HTMLInputElement;
    if (input) {
      const members = input.value
        .split(',')
        .map(member => member.trim())
        .filter(member => member.length > 0);
      
      this.registrationData.update(data => ({
        ...data,
        teamMembers: members
      }));
    }
  }

  getTeamMembersString(): string {
    return this.registrationData().teamMembers?.join(', ') || '';
  }

  // ========== PAYMENT ==========
  onPaymentMethodChange(method: 'wallet' | 'card' | 'upi'): void {
    this.registrationData.update(data => ({
      ...data,
      paymentMethod: method
    }));
  }

  isRegisterButtonDisabled(): boolean {
    const event = this.selectedEvent();
    if (!event) return true;
    
    if (event.isPaid && event.registrationFee > 0) {
      if (this.registrationData().paymentMethod === 'wallet' && 
          this.currentUser().walletBalance < event.registrationFee) {
        return true;
      }
    }
    return false;
  }

  addWalletBalance(amount: number): void {
    if (amount <= 0) return;
    this.currentUser.update(user => ({
      ...user,
      walletBalance: user.walletBalance + amount
    }));
    const notification: Notification = {
      id: 'not' + Date.now(),
      title: 'Wallet Recharged',
      message: `₹${amount} has been added to your wallet`,
      type: 'success',
      read: false,
      createdAt: new Date()
    };
    this.notifications.update(n => [notification, ...n]);
    alert(`₹${amount} added to wallet successfully!`);
  }

  processPayment(paymentId: string): void {
    const payment = this.payments().find(p => p.id === paymentId);
    if (!payment) return;
    this.payments.update(payments =>
      payments.map(p =>
        p.id === paymentId ? { ...p, status: 'completed' } : p
      )
    );
    const notification: Notification = {
      id: 'not' + Date.now(),
      title: 'Payment Successful',
      message: `Your payment of ₹${payment.amount} for ${payment.eventName} has been completed`,
      type: 'success',
      read: false,
      createdAt: new Date()
    };
    this.notifications.update(n => [notification, ...n]);
    alert('Payment processed successfully!');
  }

  // ========== NOTIFICATIONS ==========
  markNotificationAsRead(notificationId: string): void {
    this.notifications.update(notifications =>
      notifications.map(n =>
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
  }

  markAllNotificationsAsRead(): void {
    this.notifications.update(notifications =>
      notifications.map(n => ({ ...n, read: true }))
    );
  }

  clearAllNotifications(): void {
    if (confirm('Clear all notifications?')) {
      this.notifications.set([]);
    }
  }

  // ========== PROFILE ==========
  updateProfile(updatedData: Partial<User>): void {
    this.currentUser.update(user => ({
      ...user,
      ...updatedData
    }));
    const notification: Notification = {
      id: 'not' + Date.now(),
      title: 'Profile Updated',
      message: 'Your profile has been updated successfully',
      type: 'success',
      read: false,
      createdAt: new Date()
    };
    this.notifications.update(n => [notification, ...n]);
    alert('Profile updated successfully!');
  }

  // ========== HELPER FUNCTIONS ==========
  formatDate(date: Date | undefined | null, format: string = 'medium'): string {
    if (!date) return '';
    const d = new Date(date);
    if (format === 'MMM') {
      return d.toLocaleString('default', { month: 'short' });
    } else if (format === 'd') {
      return d.getDate().toString();
    } else if (format === 'h:mm a') {
      return d.toLocaleString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } else if (format === 'fullDate') {
      return d.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    } else {
      return d.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  }

  getEventTypeIcon(type: string): string {
    const icons: Record<string, string> = {
      technical: '💻',
      cultural: '🎭',
      sports: '⚽',
      workshop: '🔧',
      seminar: '📚'
    };
    return icons[type] || '📅';
  }

  getStatusBadgeClass(status: string): string {
    const classes: Record<string, string> = {
      upcoming: 'badge-upcoming',
      ongoing: 'badge-ongoing',
      completed: 'badge-completed',
      cancelled: 'badge-cancelled'
    };
    return classes[status] || '';
  }

  getPaymentStatusClass(status: string): string {
    const classes: Record<string, string> = {
      pending: 'text-warning',
      completed: 'text-success',
      failed: 'text-danger',
      refunded: 'text-info'
    };
    return classes[status] || '';
  }

  getNotificationIcon(type: string): string {
    const icons: Record<string, string> = {
      success: '✅',
      warning: '⚠️',
      error: '❌',
      info: 'ℹ️'
    };
    return icons[type] || '📢';
  }

  isEventRegistered(eventId: string): boolean {
    return this.currentUser().registeredEvents.includes(eventId);
  }

  isRegistrationAvailable(event: DashboardEvent): boolean {
    return event.status === 'upcoming' && 
           event.currentParticipants < event.maxParticipants &&
           new Date() < new Date(event.registrationDeadline);
  }
}