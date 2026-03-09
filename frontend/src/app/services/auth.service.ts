import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface UserData {
  token: string;
  role: string;
  fullName: string;
  email: string;
  userId?: string;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  public loginEvent$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, data);
  }

  login(data: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, data);
  }

  saveUserData(token: string, role: string, fullName: string, email: string, userId?: string) {
    const user: UserData = { token, role, fullName, email, userId };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.loginEvent$.next();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  public getUser(): UserData | null {
    try { return JSON.parse(localStorage.getItem('user') || 'null'); }
    catch { return null; }
  }

  getRole(): string | null     { return this.getUser()?.role     || null; }
  getFullName(): string | null { return this.getUser()?.fullName || null; }
  getEmail(): string | null    { return this.getUser()?.email    || null; }
  getUserId(): string | null   { return this.getUser()?.userId   || null; }

  isLoggedIn(): boolean { return !!this.getToken(); }

  /**
   * Call this inside every protected dashboard's ngOnInit.
   * Returns true if the current session matches the expected role.
   * If not, it clears stale data so the next tab refresh won't bleed credentials.
   */
  isAuthorized(expectedRole: string | string[]): boolean {
    const role = this.getRole();
    if (!role || !this.isLoggedIn()) return false;
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    return allowed.includes(role);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.loginEvent$.next();   // notify subscribers (e.g. chat) that session ended
  }
}