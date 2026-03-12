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
  feedback?: { userId: string; rating: number; comment?: string; createdAt?: Date }[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl = 'http://localhost:5000/api/events';

  private apiUrl = 'http://localhost:5000/api/events';

  constructor(private http: HttpClient) {}

  getAllEvents(filters?: {
    startDate?: string;
    endDate?: string;
    status?: string;
    type?: string;
    category?: string;
    organizer?: string;
  }): Observable<Event[]> {

    let params = new HttpParams();

    if (filters) {
      Object.entries(filters).forEach(([k, v]) => {
        if (v) params = params.set(k, v);
      });
    }

    return this.http.get<Event[]>(this.apiUrl, { params });
  }

  getStats(): Observable<any> {
    return this.http.get(`${this.apiUrl}/stats`);
  }

  getEventById(id: string): Observable<Event> {
    return this.http.get<Event>(`${this.apiUrl}/${id}`);
  }

  createEvent(data: FormData | any): Observable<any> {
    return this.http.post(this.apiUrl, data);
  }

  updateEvent(id: string, data: FormData | any): Observable<any> {
    return this.http.put(`${this.apiUrl}/${id}`, data);
  }

  deleteEvent(id: string): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  registerForEvent(eventId: string, selectedSlot?: string): Observable<any> {
    return this.http.post(
      `http://localhost:5000/api/registrations/${eventId}/register`,
      { selectedSlot }
    );
  }

  bulkUpdateRegistrationStatus(
    ids: string[],
    status: 'approved' | 'rejected' | 'pending'
  ): Observable<any> {

    return this.http.patch(
      `http://localhost:5000/api/registrations/bulk-status`,
      { ids, status }
    );
  }

  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`http://localhost:5000/api/registrations/${id}`);
  }

  getEventRegistrations(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/registrations`);
  }

  getMyRegistrations(): Observable<any> {
    return this.http.get(
      `http://localhost:5000/api/registrations/my/registrations`
    );
  }

  submitFeedback(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, data);
  }
}