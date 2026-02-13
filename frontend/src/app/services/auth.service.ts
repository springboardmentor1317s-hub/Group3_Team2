import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  // 🔹 Backend base URL
  private apiUrl = 'http://localhost:5000/api/auth';

  constructor(private http: HttpClient) {}

  // 🔹 Register API
  register(userData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/register`, userData);
  }

  // 🔹 Login API
  login(loginData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/login`, loginData);
  }

  // 🔹 Save token, role, and fullName in localStorage
  saveUserData(token: string, role: string, fullName: string) {
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('fullName', fullName);
  }

  // 🔹 Get stored token
  getToken(): string | null {
    return localStorage.getItem('token');
  }

  // 🔹 Get stored user role
  getRole(): string | null {
    return localStorage.getItem('role');
  }

  // 🔹 Get stored fullName
  getFullName(): string | null {
    return localStorage.getItem('fullName');
  }

  // 🔹 Check if user is logged in
  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  // 🔹 Logout user
  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
  }

  // 🔹 Get headers for authenticated requests
  getAuthHeaders(): HttpHeaders {
    const token = this.getToken();
    return new HttpHeaders({
      Authorization: token ? `Bearer ${token}` : ''
    });
  }
}