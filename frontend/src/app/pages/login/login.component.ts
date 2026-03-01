import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  email: string = '';
  password: string = '';
  errorMessage: string = '';

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    this.errorMessage = '';
    const trimmedEmail = this.email.trim();

    if (!trimmedEmail || !this.password) {
      this.errorMessage = 'Email and password are required.';
      return;
    }

    const loginData = {
      email: trimmedEmail,
      password: this.password
    };

    this.authService.login(loginData).subscribe({
      next: (res: any) => {
  if (!res?.token) {
    this.errorMessage = 'Invalid server response.';
    return;
  }

  // Save token and user data (including email)
  this.authService.saveUserData(
    res.token,
    res.role,
    res.fullName,
    res.email  // Pass email here
  );

  // Redirect based on role
  this.redirectBasedOnRole(res.role);
},
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          'Login failed. Please check your credentials.';
      }
    });
  }

  // Helper method for role-based redirection
  private redirectBasedOnRole(role: string): void {
    switch(role) {
      case 'student':
        this.router.navigate(['/student-dashboard']);
        break;
      case 'college-admin':
        this.router.navigate(['/admin-dashboard']);
        break;
      case 'superadmin':
        this.router.navigate(['/super-admin-dashboard']);
        break;
      default:
        this.errorMessage = 'Unknown role.';
        this.router.navigate(['/login']);
    }
  }
}