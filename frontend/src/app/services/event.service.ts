import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Event {
  _id?: string;
  title: string;
  description: string;
  type: 'technical' | 'cultural' | 'sports' | 'workshop' | 'seminar';
  category: 'college' | 'inter-college';
  venue: string;
  startDate: Date;
  endDate: Date;
  registrationDeadline: Date;
  maxParticipants: number;
  currentParticipants?: number;
  registrationFee: number;
  isPaid?: boolean;
  organizer: string;
  contactEmail: string;
  status?: 'upcoming' | 'ongoing' | 'completed' | 'cancelled';
  createdBy?: string;
  registeredUsers?: string[];
  imageUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class EventService {
  private apiUrl = 'http://localhost:5000/api/events';

  constructor(private http: HttpClient) { }

  // Get all events with optional filters
  getAllEvents(filters?: { startDate?: string; endDate?: string; status?: string; type?: string; organizer?: string }): Observable<Event[]> {
    let params: any = {};
    if (filters) {
      if (filters.startDate) params.startDate = filters.startDate;
      if (filters.endDate) params.endDate = filters.endDate;
      if (filters.status) params.status = filters.status;
      if (filters.type) params.type = filters.type;
      if (filters.organizer) params.organizer = filters.organizer;
    }

    console.log('Fetching events from:', this.apiUrl, 'with filters:', params);
    return this.http.get<Event[]>(this.apiUrl, { params });
  }

  // Get dashboard statistics
  getStats(): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.get(`${this.apiUrl}/stats`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Get single event
  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  // Create event (admin only)
  createEvent(eventData: any): Observable<any> {
    const token = localStorage.getItem('token');
    console.log('🔵 Creating event with data:', eventData);
    console.log('🔵 Token exists:', !!token);

    if (!token) {
      console.error('❌ No token found!');
    }

    return this.http.post(this.apiUrl, eventData, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
  }
  // Update event (admin only)
  updateEvent(id: string, eventData: Event): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.put(`${this.apiUrl}/${id}`, eventData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Delete event (admin only)
  deleteEvent(id: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Register for event (student only)
  registerForEvent(id: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.apiUrl}/${id}/register`, {}, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Unregister from event (student only)
  unregisterFromEvent(id: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.delete(`${this.apiUrl}/${id}/unregister`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Submit feedback for completed event (student only)
  submitFeedback(id: string, feedbackData: { rating: number; comment: string }): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.post(`${this.apiUrl}/${id}/feedback`, feedbackData, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }

  // Get user registrations (student only)
  getUserRegistrations(email?: string): Observable<any> {
    const token = localStorage.getItem('token');
    return this.http.get(`${this.apiUrl}/my-registrations`, {
      headers: { Authorization: `Bearer ${token}` }
    });
  }
}
