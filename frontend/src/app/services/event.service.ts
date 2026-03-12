import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface Event {
  _id?: string;
  title: string;
  description: string;
  type: 'technical' | 'cultural' | 'sports' | 'workshop' | 'seminar';
  category: 'college' | 'inter-college';
  venue: string;
  startDate: Date | string;
  endDate: Date | string;
  registrationDeadline: Date | string;
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
  feedback?: { userId: string; rating: number; comment?: string; createdAt?: Date; }[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl = 'http://localhost:5000/api/events';

  constructor(private http: HttpClient) { }

  getAllEvents(filters?: {
    startDate?: string; endDate?: string; status?: string;
    type?: string; category?: string; organizer?: string;
  }): Observable<Event[]> {
    let params = new HttpParams();
    if (filters) {
      Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    }
    return this.http.get<Event[]>(this.apiUrl, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  // Pass FormData when uploading an image, plain object otherwise
  createEvent(data: FormData | any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateEvent(id: string, data: FormData | any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  register(eventId: string, slot?: string): Observable<any> {
    const payload = slot ? { slot } : {};
    return this.http.post(`${this.apiUrl}/${eventId}/register`, payload);
  }

  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}/unregister`);
  }

  getEventRegistrations(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/registrations`);
  }

  getMyRegistrations(): Observable<any> {
    return this.http.get(`${this.apiUrl}/my/registrations`);
  }

  submitFeedback(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, data);
  }

  updateRegistrationStatus(registrationId: string, status: string): Observable<any> {
    const url = `http://localhost:5000/api/registrations/${registrationId}`;
    return this.http.put(url, { status });
  }

  // Admin: Bulk update the status of multiple registrations for their events
  bulkUpdateRegistrationStatus(registrationIds: string[], status: string): Observable<any> {
    return this.http.put(`${this.apiUrl}/registrations/bulk-status`, { registrationIds, status });
  }
}