import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  private useMock = false;

  // Observable to let components react to successful login
  public loginEvent$ = new Subject<void>();

  constructor(private http: HttpClient) {
    console.log('🔵 AuthService initialized with URL:', this.apiUrl);
  }

  register(userData: any): Observable<any> {
    console.log('📝 Registering user with:', userData);
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  login(loginData: any): Observable<any> {
    console.log('🔑 Logging in with:', loginData);
    return this.http.post(`${this.apiUrl}/login`, loginData);
  }

  saveUserData(token: string, role: string, fullName: string, email?: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('fullName', fullName);
    if (email) {
      localStorage.setItem('email', email);
    }
    console.log('✅ User data saved');

    // Notify subscribers
    this.loginEvent$.next();
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getRole(): string | null {
    return localStorage.getItem('role');
  }

  getFullName(): string | null {
    return localStorage.getItem('fullName');
  }

  getEmail(): string | null {
    return localStorage.getItem('email');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    console.log('👋 User logged out');
  }
}