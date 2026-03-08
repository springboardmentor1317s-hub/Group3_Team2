import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
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

  // Correct backend API
  private apiUrl = 'http://localhost:8800/api/events';

  constructor(private http: HttpClient) {}

  // Helper function to get headers with token
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    });
  }

  // Get all events
  getAllEvents(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
    organizer?: string;
  }): Observable<Event[]> {

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
    return this.http.get(`${this.apiUrl}/stats`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get single event by ID
  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  // Create event (admin only)
  createEvent(eventData: any): Observable<any> {
    console.log('Creating event:', eventData);

    return this.http.post(this.apiUrl, eventData, {
      headers: this.getAuthHeaders()
    });
  }

  // Update event (admin only)
  updateEvent(id: string, eventData: Event): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, eventData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete event (admin only)
  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Register for event (student)
  registerForEvent(id: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/register`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Unregister from event
  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/unregister`, {
      headers: this.getAuthHeaders()
    });
  }

  // Submit feedback
  submitFeedback(id: string, feedbackData: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, feedbackData, {
      headers: this.getAuthHeaders()
    });
  }

  // Get user's registered events
  getUserRegistrations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my-registrations`, {
      headers: this.getAuthHeaders()
    });
  }
}