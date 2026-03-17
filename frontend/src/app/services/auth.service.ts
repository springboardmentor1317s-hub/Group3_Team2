import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface UserData {
  token: string; role: string; fullName: string;
  email: string; userId?: string; college?: string; walletBalance?: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = 'http://localhost:5000/api/auth';
  public loginEvent$ = new Subject<void>();

  constructor(private http: HttpClient) {}

  register(data: any): Observable<any> { return this.http.post(`${this.apiUrl}/register`, data); }
  login(data: any): Observable<any>    { return this.http.post(`${this.apiUrl}/login`, data); }

  saveUserData(token: string, role: string, fullName: string, email: string, userId?: string, college?: string, walletBalance?: number) {
    const user: UserData = { token, role, fullName, email, userId, college, walletBalance };
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    this.loginEvent$.next();
  }

  updateWalletBalance(balance: number) {
    const user = this.getUser();
    if (user) {
      user.walletBalance = balance;
      localStorage.setItem('user', JSON.stringify(user));
    }
  }

  getToken(): string | null   { return localStorage.getItem('token'); }
  getUser(): UserData | null  { try { return JSON.parse(localStorage.getItem('user') || 'null'); } catch { return null; } }
  getRole(): string | null    { return this.getUser()?.role || null; }
  getFullName(): string | null{ return this.getUser()?.fullName || null; }
  getEmail(): string | null   { return this.getUser()?.email || null; }
  getUserId(): string | null  { return this.getUser()?.userId || null; }
  getCollege(): string | null { return this.getUser()?.college || null; }
  getWallet(): number         { return this.getUser()?.walletBalance ?? 0; }
  isLoggedIn(): boolean       { return !!this.getToken(); }

  isAuthorized(expectedRole: string | string[]): boolean {
    const role = this.getRole();
    if (!role || !this.isLoggedIn()) return false;
    const allowed = Array.isArray(expectedRole) ? expectedRole : [expectedRole];
    return allowed.includes(role);
  }

  getWalletBalance(): Observable<any> { return this.http.get(`${this.apiUrl}/wallet`); }
  topUpWallet(amount: number): Observable<any> { return this.http.post(`${this.apiUrl}/wallet/topup`, { amount }); }

  logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    this.loginEvent$.next();
  }
}
