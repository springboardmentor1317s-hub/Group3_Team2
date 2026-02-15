import { AuthService } from '../services/auth.service';
import { Component, OnInit, signal, computed, effect } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

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

interface Event {
  id: string;
  title: string;
  description: string;
  type: 'technical' | 'cultural' | 'sports' | 'workshop' | 'seminar';
  category: 'college' | 'inter-college';
  venue: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxParticipants: number;
  currentParticipants: number;
  registrationFee: number;
  collegeName?: string;
  organizer: string;
  contactEmail: string;
  imageUrl: string;
  isPaid: boolean;
  status: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  registeredUsers?: string[];
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

@Component({
  selector: 'app-student-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './student-dashboard.html',
  styleUrls: ['./student-dashboard.css']
})
export class DashboardComponent implements OnInit {
  // ========== SIGNALS ==========
  currentView = signal<'overview' | 'events' | 'registered' | 'profile' | 'notifications' | 'payments' | 'schedule' | 'register'>('overview');
  sidebarCollapsed = signal<boolean>(false);
  showMobileMenu = signal<boolean>(false);
  searchQuery = signal<string>('');
  selectedEventType = signal<string>('all');
  selectedCategory = signal<string>('all');
  selectedEvent = signal<Event | null>(null);
  
  registrationData = signal<RegistrationData>({
    eventId: '',
    teamName: '',
    teamMembers: [],
    paymentMethod: 'wallet'
  });
  
  // ========== MOCK DATA ==========
  currentUser = signal<User>({
    id: '1',
    name: 'Riya Jain',
    email: 'jainriya@college.edu',
    college: 'University of Technology',
    department: 'Computer Science',
    year: '3rd Year',
    rollNumber: 'CS2021001',
    phone: '+1 234 567 8900',
    walletBalance: 2500,
    registeredEvents: ['evt001', 'evt003', 'evt005']
  });

  allEvents = signal<Event[]>([
    {
      id: 'evt001',
      title: 'Tech Fest 2024',
      description: 'Annual technical festival featuring coding competitions, robotics, AI workshops, and tech exhibitions. Prizes worth ₹50,000 to be won!',
      type: 'technical',
      category: 'inter-college',
      venue: 'Main Auditorium & Engineering Block',
      startDate: new Date('2024-04-15T09:00:00'),
      endDate: new Date('2024-04-17T18:00:00'),
      registrationDeadline: new Date('2024-04-10T23:59:59'),
      maxParticipants: 500,
      currentParticipants: 350,
      registrationFee: 500,
      collegeName: 'MIT',
      organizer: 'Technical Committee',
      contactEmail: 'techfest@mit.edu',
      imageUrl: 'assets/techfest.jpg',
      isPaid: true,
      status: 'upcoming',
      registeredUsers: ['1']
    },
    {
      id: 'evt002',
      title: 'Cultural Night 2024',
      description: 'Annual cultural extravaganza with music, dance, drama, and fashion show. Showcase your talent and win exciting prizes!',
      type: 'cultural',
      category: 'college',
      venue: 'Open Air Theatre',
      startDate: new Date('2024-03-25T17:00:00'),
      endDate: new Date('2024-03-25T23:00:00'),
      registrationDeadline: new Date('2024-03-20T23:59:59'),
      maxParticipants: 200,
      currentParticipants: 150,
      registrationFee: 0,
      collegeName: 'University of Technology',
      organizer: 'Cultural Club',
      contactEmail: 'cultural@tech.edu',
      imageUrl: 'assets/cultural.jpg',
      isPaid: false,
      status: 'upcoming'
    },
    {
      id: 'evt003',
      title: 'Inter-College Sports Meet',
      description: 'Multi-sport tournament including cricket, football, basketball, and athletics. Participate and compete with top colleges!',
      type: 'sports',
      category: 'inter-college',
      venue: 'University Sports Complex',
      startDate: new Date('2024-05-01T08:00:00'),
      endDate: new Date('2024-05-05T18:00:00'),
      registrationDeadline: new Date('2024-04-25T23:59:59'),
      maxParticipants: 1000,
      currentParticipants: 600,
      registrationFee: 300,
      collegeName: 'Sports Authority',
      organizer: 'Sports Department',
      contactEmail: 'sports@tech.edu',
      imageUrl: 'assets/sports.jpg',
      isPaid: true,
      status: 'upcoming',
      registeredUsers: ['1']
    },
    {
      id: 'evt004',
      title: 'AI & ML Workshop',
      description: 'Hands-on workshop on Artificial Intelligence and Machine Learning with Python. Learn from industry experts.',
      type: 'workshop',
      category: 'college',
      venue: 'CS Department Lab 101',
      startDate: new Date('2024-03-10T10:00:00'),
      endDate: new Date('2024-03-12T16:00:00'),
      registrationDeadline: new Date('2024-03-08T23:59:59'),
      maxParticipants: 50,
      currentParticipants: 45,
      registrationFee: 200,
      collegeName: 'University of Technology',
      organizer: 'CS Department',
      contactEmail: 'workshops@tech.edu',
      imageUrl: 'assets/workshop.jpg',
      isPaid: true,
      status: 'ongoing'
    },
    {
      id: 'evt005',
      title: 'National Level Seminar',
      description: 'Seminar on "Future of Technology" by renowned speakers from industry and academia.',
      type: 'seminar',
      category: 'inter-college',
      venue: 'Conference Hall',
      startDate: new Date('2024-02-20T09:00:00'),
      endDate: new Date('2024-02-20T17:00:00'),
      registrationDeadline: new Date('2024-02-15T23:59:59'),
      maxParticipants: 300,
      currentParticipants: 280,
      registrationFee: 0,
      collegeName: 'Tech University',
      organizer: 'IEEE Student Branch',
      contactEmail: 'seminar@ieee.org',
      imageUrl: 'assets/seminar.jpg',
      isPaid: false,
      status: 'completed',
      registeredUsers: ['1']
    }
  ]);

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
    return this.allEvents().filter(event => userEvents.includes(event.id));
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
    private router: Router
  ) {
    effect(() => {
      console.log('Current view:', this.currentView());
    });
  }

  // ========== LIFECYCLE ==========
  ngOnInit(): void {
    // Check if user is authorized to view this dashboard
    if (!this.authService.isLoggedIn() || this.authService.getRole() !== 'student') {
      this.router.navigate(['/login']);
      return;
    }
    this.checkInitialRoute();
  }

  checkInitialRoute(): void {
    // Mock function
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
  selectEventForRegistration(event: Event): void {
    this.selectedEvent.set(event);
    this.registrationData.update(data => ({
      ...data,
      eventId: event.id,
      teamName: '',
      teamMembers: [],
      paymentMethod: 'wallet'
    }));
    this.setView('register');
  }

  registerForEvent(): void {
    const event = this.selectedEvent();
    if (!event) return;

    if (this.currentUser().registeredEvents.includes(event.id)) {
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
      registeredEvents: [...user.registeredEvents, event.id]
    }));

    this.allEvents.update(events => 
      events.map(e => 
        e.id === event.id 
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
      eventId: event.id
    };

    this.notifications.update(n => [newNotification, ...n]);

    if (event.isPaid && event.registrationFee > 0) {
      const newPayment: Payment = {
        id: 'pay' + Date.now(),
        eventId: event.id,
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
          e.id === eventId
            ? { ...e, currentParticipants: e.currentParticipants - 1 }
            : e
        )
      );

      const event = this.allEvents().find(e => e.id === eventId);
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

  isRegistrationAvailable(event: Event): boolean {
    return event.status === 'upcoming' && 
           event.currentParticipants < event.maxParticipants &&
           new Date() < new Date(event.registrationDeadline);
  }
}