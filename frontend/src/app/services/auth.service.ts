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
    localStorage.setItem('role', role);
    localStorage.setItem('fullName', fullName);
    localStorage.setItem('email', email);
    localStorage.setItem('user', JSON.stringify(user));
    this.loginEvent$.next();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUser(): UserData | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  getRole(): string | null { 
    return this.getUser()?.role || localStorage.getItem('role') || null; 
  }
  
  getFullName(): string | null { 
    return this.getUser()?.fullName || localStorage.getItem('fullName') || null; 
  }
  
  getEmail(): string | null { 
    return this.getUser()?.email || localStorage.getItem('email') || null; 
  }
  
  getUserId(): string | null { 
    return this.getUser()?.userId || null; 
  }

  isLoggedIn(): boolean { 
    return !!this.getToken(); 
  }

  isAuthorized(expectedRole: string | string[]): boolean {
    const role = this.getRole();
    if (!role || !this.isLoggedIn()) return false;
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    return allowed.includes(role);
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('user');
    this.loginEvent$.next();
  }
}