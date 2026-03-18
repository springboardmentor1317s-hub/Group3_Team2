import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface UserData {
  token: string; 
  role: string; 
  fullName: string;
  email: string; 
  userId?: string; 
  college?: string; 
  walletBalance?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  public loginEvent$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  // ===== AUTHENTICATION =====
  register(data: any): Observable<any> { 
    return this.http.post(`${this.apiUrl}/register`, data); 
  }
  
  login(data: any): Observable<any> {    
    return this.http.post(`${this.apiUrl}/login`, data); 
  }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('fullName');
    localStorage.removeItem('email');
    localStorage.removeItem('user');
    this.loginEvent$.next();
  }

  // ===== USER DATA MANAGEMENT =====
  saveUserData(token: string, role: string, fullName: string, email: string, userId?: string, college?: string, walletBalance?: number) {
    const user: UserData = { token, role, fullName, email, userId, college, walletBalance };
    localStorage.setItem('token', token);
    localStorage.setItem('role', role);
    localStorage.setItem('fullName', fullName);
    localStorage.setItem('email', email);
    localStorage.setItem('user', JSON.stringify(user));
    this.loginEvent$.next();
  }

  getUser(): UserData | null {
    try {
      const userStr = localStorage.getItem('user');
      return userStr ? JSON.parse(userStr) : null;
    } catch {
      return null;
    }
  }

  getToken(): string | null {
    return localStorage.getItem('token');
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

  getCollege(): string | null {
    return this.getUser()?.college || null;
  }

  getWallet(): number {
    const user = this.getUser();
    return user?.walletBalance || 0;
  }

  updateWalletBalance(balance: number) {
    const user = this.getUser();
    if (user) {
      user.walletBalance = balance;
      localStorage.setItem('user', JSON.stringify(user));
    }
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

  // ===== WALLET =====
  getWalletBalance(): Observable<any> { 
    return this.http.get(`${this.apiUrl}/wallet`); 
  }
  
  topUpWallet(amount: number): Observable<any> { 
    return this.http.post(`${this.apiUrl}/wallet/topup`, { amount }); 
  }

  // ===== USER MANAGEMENT (for Super Admin) =====
 /**
   * Get user by ID
   */
  getUserById(id: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/users/${id}`);
  }

  /**
   * Update user role
   */
  updateUserRole(id: string, role: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/users/${id}/role`, { role });
  }
}