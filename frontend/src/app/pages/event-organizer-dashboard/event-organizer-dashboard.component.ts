import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

interface Event {
  id: number;
  name: string;
  date: Date;
  status: 'active' | 'upcoming' | 'completed' | 'cancelled';
  registrations: number;
  capacity: number;
  averageParticipants: number;
  location: string;
  category: string;
}

interface Registration {
  id: number;
  eventId: number;
  eventName: string;
  attendeeName: string;
  email: string;
  registrationDate: Date;
  status: 'confirmed' | 'pending' | 'cancelled';
  ticketType: string;
}

@Component({
  selector: 'app-event-organizer-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-organizer-dashboard.component.html',
  styleUrls: ['./event-organizer-dashboard.component.css']
})
export class EventOrganizerDashboardComponent implements OnInit {
  totalEvents: number = 0;
  activeEvents: number = 0;
  totalRegistrations: number = 0;
  averageParticipants: number = 0;
  
  events: Event[] = [];
  filteredEvents: Event[] = [];
  registrations: Registration[] = [];
  filteredRegistrations: Registration[] = [];
  
  selectedEventId: number | null = null;
  showCreateEventModal: boolean = false;
  showRegistrationsModal: boolean = false;
  showExportModal: boolean = false;
  selectedExportFormat: 'csv' | 'excel' | 'pdf' = 'csv';
  
  eventSearchTerm: string = '';
  eventStatusFilter: string = 'all';
  searchTerm: string = '';
  selectedStatus: string = 'all';
  
  createEventForm: FormGroup;
  
  registrationTrendData: any;
  eventCategoryData: any;
  
  statusOptions = ['all', 'active', 'upcoming', 'completed', 'cancelled'];
  categoryOptions = ['Conference', 'Workshop', 'Seminar', 'Meetup', 'Webinar', 'Networking'];
  exportFormatOptions = ['csv', 'excel', 'pdf'];

  constructor(private fb: FormBuilder) {
    this.createEventForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(3)]],
      date: ['', Validators.required],
      time: ['', Validators.required],
      location: ['', Validators.required],
      category: ['', Validators.required],
      capacity: ['', [Validators.required, Validators.min(1)]],
      description: ['', Validators.required],
      ticketTypes: this.fb.group({
        regular: ['', Validators.min(0)],
        vip: ['', Validators.min(0)],
        earlyBird: ['', Validators.min(0)]
      })
    });
  }

  ngOnInit(): void {
    this.loadDashboardData(); 
    this.initializeCharts();
    this.filteredEvents = [...this.events];
  }

  private loadDashboardData(): void {
    this.events = [
      { id: 1, name: 'Tech Conference 2024', date: new Date('2024-06-15'), status: 'active', registrations: 245, capacity: 300, averageParticipants: 235, location: 'Convention Center', category: 'Conference' },
      { id: 2, name: 'Start Up', date: new Date('2024-07-20'), status: 'upcoming', registrations: 75, capacity: 100, averageParticipants: 70, location: 'Tech Hub', category: 'Workshop' },
      { id: 3, name: 'Cultural Fest', date: new Date('2024-05-10'), status: 'completed', registrations: 120, capacity: 150, averageParticipants: 115, location: 'City Lounge', category: 'Networking' },
      { id: 4, name: 'AI Summit', date: new Date('2024-08-05'), status: 'active', registrations: 180, capacity: 250, averageParticipants: 175, location: 'Innovation Center', category: 'Conference' },
      { id: 5, name: 'Hackathon', date: new Date('2024-06-30'), status: 'upcoming', registrations: 45, capacity: 60, averageParticipants: 40, location: 'Creative Studio', category: 'Workshop' },
    ];

    this.registrations = [
      { id: 1, eventId: 1, eventName: 'Tech Conference ', attendeeName: 'Sneha M', email: 'sneha123@example.com', registrationDate: new Date('2024-05-01'), status: 'confirmed', ticketType: 'VIP' },
      { id: 2, eventId: 1, eventName: 'Cultural Fest', attendeeName: 'Riya Jane', email: 'jane@example.com', registrationDate: new Date('2024-05-02'), status: 'confirmed', ticketType: 'Regular' },
      { id: 3, eventId: 2, eventName: 'Start Up', attendeeName: 'Suzy Dsouza', email: 'suzy@example.com', registrationDate: new Date('2024-05-03'), status: 'pending', ticketType: 'Early Bird' },
      { id: 4, eventId: 1, eventName: 'Tech Conference ', attendeeName: 'Alice Williams', email: 'alice@example.com', registrationDate: new Date('2024-05-04'), status: 'confirmed', ticketType: 'Regular' },
      { id: 5, eventId: 3, eventName: 'Networking Mixer', attendeeName: 'Chris Brown', email: 'chris701@example.com', registrationDate: new Date('2024-04-15'), status: 'confirmed', ticketType: 'Regular' },
      { id: 6, eventId: 4, eventName: 'AI Summit', attendeeName: 'Diana Prisley', email: 'diana@example.com', registrationDate: new Date('2024-05-10'), status: 'pending', ticketType: 'VIP' },
      { id: 7, eventId: 2, eventName: 'Hackathon', attendeeName: 'Evan Jain', email: 'evan@example.com', registrationDate: new Date('2024-05-11'), status: 'cancelled', ticketType: 'Regular' },
    ];

    this.filteredRegistrations = [...this.registrations];
    this.calculateStatistics();
  }

  private calculateStatistics(): void {
    this.totalEvents = this.events.length;
    this.activeEvents = this.events.filter(e => e.status === 'active').length;
    this.totalRegistrations = this.events.reduce((sum, event) => sum + event.registrations, 0);
    this.averageParticipants = Math.round(
      this.events.reduce((sum, event) => sum + event.averageParticipants, 0) / this.events.length
    );
  }

  private initializeCharts(): void {
    this.registrationTrendData = {
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [
        {
          label: 'Registrations',
          data: [65, 85, 120, 145, 180, 245],
          fill: false,
          borderColor: '#4CAF50',
          tension: 0.4
        }
      ]
    };

    this.eventCategoryData = {
      labels: ['Conference', 'Workshop', 'Seminar', 'Meetup', 'Webinar', 'Networking'],
      datasets: [
        {
          data: [35, 25, 15, 10, 8, 7],
          backgroundColor: ['#4CAF50', '#2196F3', '#FF9800', '#9C27B0', '#F44336', '#009688']
        }
      ]
    };
  }

  openCreateEventModal(): void {
    this.showCreateEventModal = true;
  }

  closeCreateEventModal(): void {
    this.showCreateEventModal = false;
    this.createEventForm.reset();
  }

  createEvent(): void {
    if (this.createEventForm.valid) {
      const formValue = this.createEventForm.value;
      const newEvent: Event = {
        id: this.events.length + 1,
        name: formValue.name,
        date: new Date(formValue.date),
        status: 'upcoming',
        registrations: 0,
        capacity: formValue.capacity,
        averageParticipants: 0,
        location: formValue.location,
        category: formValue.category
      };
      
      this.events.push(newEvent);
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      this.closeCreateEventModal();
      alert('Event created successfully!');
    }
  }

  viewAllRegistrations(): void {
    this.showRegistrationsModal = true;
    this.filteredRegistrations = [...this.registrations];
    this.searchTerm = '';
    this.selectedStatus = 'all';
  }

  closeRegistrationsModal(): void {
    this.showRegistrationsModal = false;
  }

  onChartFilterChange(event: any): void {
    const value = event.target.value;
    console.log('Chart filter changed:', value);
  }

  onStatusFilterChange(event: any): void {
    this.eventStatusFilter = event.target.value;
    this.filterEvents();
  }

  onEventSearch(event: any): void {
    this.eventSearchTerm = event.target.value;
    this.filterEvents();
  }

  filterEvents(): void {
    this.filteredEvents = this.events.filter(event => {
      const matchesStatus = this.eventStatusFilter === 'all' || event.status === this.eventStatusFilter;
      const matchesSearch = this.eventSearchTerm === '' || 
        event.name.toLowerCase().includes(this.eventSearchTerm.toLowerCase()) ||
        event.location.toLowerCase().includes(this.eventSearchTerm.toLowerCase());
      return matchesStatus && matchesSearch;
    });
  }

  filterRegistrations(searchText: string): void {
    this.searchTerm = searchText;
    this.filterRegistrationsList();
  }

  filterRegistrationsByStatus(status: string): void {
    this.selectedStatus = status;
    this.filterRegistrationsList();
  }

  filterRegistrationsList(): void {
    this.filteredRegistrations = this.registrations.filter(reg => {
      const matchesSearch = this.searchTerm === '' || 
        reg.attendeeName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.email.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        reg.eventName.toLowerCase().includes(this.searchTerm.toLowerCase());
      const matchesStatus = this.selectedStatus === 'all' || reg.status === this.selectedStatus;
      return matchesSearch && matchesStatus;
    });
  }

  updateRegistrationStatus(registrationId: number, newStatus: 'confirmed' | 'cancelled'): void {
    const registration = this.registrations.find(r => r.id === registrationId);
    if (registration) {
      const oldStatus = registration.status;
      registration.status = newStatus;
      this.filterRegistrationsList();
      
      const event = this.events.find(e => e.id === registration.eventId);
      if (event) {
        if (newStatus === 'confirmed' && oldStatus === 'pending') {
          event.registrations++;
          event.averageParticipants = Math.round((event.registrations + event.averageParticipants) / 2);
        } else if (newStatus === 'cancelled' && oldStatus === 'confirmed') {
          event.registrations--;
        }
      }
      
      this.calculateStatistics();
      this.filteredEvents = [...this.events];
    }
  }

  openExportModal(): void {
    this.showExportModal = true;
  }

  closeExportModal(): void {
    this.showExportModal = false;
  }

  onExportFormatChange(format: string): void {
    this.selectedExportFormat = format as 'csv' | 'excel' | 'pdf';
  }

  exportEventData(): void {
    let exportData: string;
    
    switch (this.selectedExportFormat) {
      case 'csv':
        exportData = this.generateCSV();
        this.downloadFile(exportData, 'event-data.csv', 'text/csv');
        break;
      case 'excel':
        exportData = this.generateExcel();
        this.downloadFile(exportData, 'event-data.xls', 'application/vnd.ms-excel');
        break;
      case 'pdf':
        alert('PDF export would be implemented with a PDF library');
        break;
    }
    
    this.closeExportModal();
    alert(`Data exported as ${this.selectedExportFormat.toUpperCase()} successfully!`);
  }

  private generateCSV(): string {
    const headers = ['Event Name', 'Date', 'Status', 'Registrations', 'Capacity', 'Location', 'Category'];
    const rows = this.events.map(event => [
      event.name,
      event.date.toLocaleDateString(),
      event.status,
      event.registrations.toString(),
      event.capacity.toString(),
      event.location,
      event.category
    ]);
    
    return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
  }

  private generateExcel(): string {
    let html = '<table>';
    html += '<tr><th>Event Name</th><th>Date</th><th>Status</th><th>Registrations</th><th>Capacity</th><th>Location</th><th>Category</th></tr>';
    
    this.events.forEach(event => {
      html += `<tr>
        <td>${event.name}</td>
        <td>${event.date.toLocaleDateString()}</td>
        <td>${event.status}</td>
        <td>${event.registrations}</td>
        <td>${event.capacity}</td>
        <td>${event.location}</td>
        <td>${event.category}</td>
      </tr>`;
    });
    
    html += '</table>';
    return html;
  }

  private downloadFile(content: string, fileName: string, mimeType: string): void {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }

  duplicateEvent(eventId: number): void {
    const event = this.events.find(e => e.id === eventId);
    if (event) {
      const duplicatedEvent: Event = {
        ...event,
        id: this.events.length + 1,
        name: `${event.name} (Copy)`,
        status: 'upcoming',
        registrations: 0,
        averageParticipants: 0
      };
      this.events.push(duplicatedEvent);
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      alert('Event duplicated successfully!');
    }
  }

  cancelEvent(eventId: number): void {
    const event = this.events.find(e => e.id === eventId);
    if (event && confirm('Are you sure you want to cancel this event?')) {
      event.status = 'cancelled';
      this.filteredEvents = [...this.events];
      this.calculateStatistics();
      alert('Event cancelled successfully!');
    }
  }

  viewEventDetails(eventId: number): void {
    alert(`Viewing details for event ID: ${eventId}`);
  }

  sendAnnouncements(): void {
    alert('Send announcements functionality would open here');
  }

  manageTickets(): void {
    alert('Ticket management functionality would open here');
  }

  teamSettings(): void {
    alert('Team settings functionality would open here');
  }

  getStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'active': 'status-active',
      'upcoming': 'status-upcoming',
      'completed': 'status-completed',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  getRegistrationStatusClass(status: string): string {
    const statusClasses: { [key: string]: string } = {
      'confirmed': 'status-confirmed',
      'pending': 'status-pending',
      'cancelled': 'status-cancelled'
    };
    return statusClasses[status] || '';
  }

  getFormattedDate(date: Date): string {
    return new Date(date).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  }
}