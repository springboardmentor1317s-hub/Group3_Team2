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

  private apiUrl = 'http://localhost:5000/api/events';
  private regUrl  = 'http://localhost:5000/api/registrations';
  private collegeUrl = 'http://localhost:5000/api/colleges';
  private reportUrl = 'http://localhost:5000/api/reports';

  constructor(private http: HttpClient) {}

  // ===== EVENT MANAGEMENT =====
  getAllEvents(filters?: { startDate?: string; endDate?: string; status?: string; type?: string; category?: string; organizer?: string; }): Observable<Event[]> {
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

  /**
   * Compute event status client-side from dates
   */
  computeStatus(event: any): string {
    if (event.status === 'cancelled') return 'cancelled';
    const now = new Date();
    const start = new Date(event.startDate);
    const end = new Date(event.endDate);
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'ongoing';
    return 'completed';
  }

  // ===== REGISTRATION MANAGEMENT =====
  registerForEvent(eventId: string, payload?: { selectedSlot?: string; paymentMethod?: string; paymentTxnId?: string; paymentAmount?: number }): Observable<any> {
    return this.http.post(`${this.regUrl}/${eventId}/register`, payload || {});
  }

  getMyRegistrations(): Observable<any> {
    return this.http.get(`${this.regUrl}/my/registrations`);
  }

  getEventRegistrations(id: string): Observable<any> {
    return this.http.get(`${this.regUrl}/${id}/registrations`);
  }

  /**
   * Update a single registration's status
   */
  updateRegistrationStatus(id: string, status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/${id}/status`, { status, rejectionReason: rejectionReason || '' });
  }

  /**
   * Bulk update registration statuses
   */
  bulkUpdateRegistrationStatus(ids: string[], status: 'approved' | 'rejected' | 'pending', rejectionReason?: string): Observable<any> {
    return this.http.patch(`${this.regUrl}/bulk-status`, { ids, status, rejectionReason: rejectionReason || '' });
  }

  unregisterFromEvent(id: string): Observable<any> {
    return this.http.delete(`${this.regUrl}/${id}`);
  }

  submitFeedback(id: string, data: { rating: number; comment: string }): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/feedback`, data);
  }

  // ===== COLLEGE MANAGEMENT (for Super Admin) =====
  /**
   * Get all colleges
  
  /**
   * Get college by ID
   */
  getCollegeById(id: string): Observable<any> {
    return this.http.get(`${this.collegeUrl}/${id}`);
  }

  /**
   * Update college status
   */
  updateCollegeStatus(id: string, status: string): Observable<any> {
    return this.http.patch(`${this.collegeUrl}/${id}/status`, { status });
  }

  /**
   * Delete college
   */
  deleteCollege(id: string): Observable<any> {
    return this.http.delete(`${this.collegeUrl}/${id}`);
  }

  /**
   * Create new college
   */
  createCollege(collegeData: any): Observable<any> {
    return this.http.post(this.collegeUrl, collegeData);
  }

  /**
   * Update college
   */
  updateCollege(id: string, collegeData: any): Observable<any> {
    return this.http.put(`${this.collegeUrl}/${id}`, collegeData);
  }

  // ===== REPORTS =====
  /**
  

  /**
   * Get monthly report
   */
  getMonthlyReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/monthly`, {
      responseType: 'blob'
    });
  }

  /**
   * Get college performance report
   */
  getCollegeReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/college`, {
      responseType: 'blob'
    });
  }

  /**
   * Get user engagement report
   */
  getUserReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/user`, {
      responseType: 'blob'
    });
  }

  /**
   * Get financial report
   */
  getFinancialReport(): Observable<Blob> {
    return this.http.get(`${this.reportUrl}/financial`, {
      responseType: 'blob'
    });
  }
}