import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  
  // Change this to test different users
  private mockRole = 'student';  // 'student' or 'college_admin'
  
  isLoggedIn(): boolean {
    // When login is ready, this will check localStorage
    return true; // Always true for testing
  }
  
  getRole(): string | null {
    console.log('AuthService.getRole() =', this.mockRole);
    return this.mockRole;
  }
  
  logout(): void {
    console.log('Logging out...');
    // Clear any stored data
    // Redirect to login (once login page exists)
    window.location.href = '/login';
  }
}