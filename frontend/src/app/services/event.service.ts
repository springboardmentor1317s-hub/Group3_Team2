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
  imageUrl?: string;
  feedback?: { userId: string; rating: number; comment?: string; createdAt?: Date }[];
}

@Injectable({ providedIn: 'root' })
export class EventService {
  private apiUrl  = 'http://localhost:5000/api/events';
  private regUrl  = 'http://localhost:5000/api/registrations';

  constructor(private http: HttpClient) {}

  getAllEvents(filters?: { startDate?: string; endDate?: string; status?: string; type?: string; category?: string; organizer?: string; }): Observable<Event[]> {
    let params = new HttpParams();
    if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params = params.set(k, v); });
    return this.http.get<Event[]>(this.apiUrl, { params });
  }

  getStats(): Observable<any> { return this.http.get(`${this.apiUrl}/stats`); }
  getEventById(id: string): Observable<Event> { return this.http.get<Event>(`${this.apiUrl}/${id}`); }

  createEvent(data: FormData | any): Observable<any> { return this.http.post(this.apiUrl, data); }
  updateEvent(id: string, data: FormData | any): Observable<any> { return this.http.put(`${this.apiUrl}/${id}`, data); }
  deleteEvent(id: string): Observable<any> { return this.http.delete(`${this.apiUrl}/${id}`); }

  registerForEvent(eventId: string, payload?: { selectedSlot?: string; paymentMethod?: string; paymentTxnId?: string; paymentAmount?: number }): Observable<any> {
    return this.http.post(`${this.regUrl}/${eventId}/register`, payload || {});
  }

  getMyRegistrations(): Observable<any> {
    return this.http.get(`${this.regUrl}/my/registrations`);
  }

  getEventRegistrations(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/${id}/registrations`);
  }

  /** Update a single registration's status */
  updateRegistrationStatus(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/${id}/status`, { status, rejectionReason: rejectionReason || '' });
  }

  /** Bulk update registration statuses */
  bulkUpdateRegistrationStatus(ids: string[], status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/bulk-status`, { ids, status, rejectionReason: rejectionReason || '' });
  }

  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`${this.regUrl}/${id}`);
  }

  submitFeedback(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, data);
  }

  /** Compute event status client-side from dates */
  computeStatus(event: any): string {
    if (event.status === 'cancelled') return 'cancelled';
    const now   = new Date();
    const start = new Date(event.startDate);
    const end   = new Date(event.endDate);
    if (now < start)               return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  }
}
