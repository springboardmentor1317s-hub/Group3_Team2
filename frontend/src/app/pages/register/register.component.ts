import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [FormsModule, CommonModule, RouterModule],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  fullName = '';
  email = '';
  college = '';
  role = 'student';   // default
  password = '';
  confirmPassword = '';

  errorMessage = '';
  successMessage = '';
  isLoading = false;

  constructor(private router: Router, private authService: AuthService) {}

  register() {

    this.errorMessage = '';

    if (!this.fullName || !this.email || !this.college || !this.role || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields.';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match.';
      return;
    }

    if (this.password.length < 8) {
      this.errorMessage = 'Password must be at least 8 characters.';
      return;
    }

    this.isLoading = true;

    const userData = {
      fullName: this.fullName,
      email: this.email,
      college: this.college,
      role: this.role,
      password: this.password
    };

    this.authService.register(userData).subscribe({

      next: (res: any) => {

        this.isLoading = false;
        this.successMessage = res.message || 'Registration successful!';

        if (res.token) {

          this.authService.saveUserData(
            res.token,
            res.role,
            res.fullName,
            res.email || this.email
          );

          setTimeout(() => this.redirectBasedOnRole(res.role), 1000);

        } else {

          setTimeout(() => this.router.navigate(['/login']), 1500);

        }

      },

      error: (err: any) => {

        this.isLoading = false;
        this.errorMessage =
          err?.error?.message || 'Registration failed. Please try again.';

      }

    });

  }

  private redirectBasedOnRole(role: string) {

    const routes: any = {
      student: '/student-dashboard',
      'college-admin': '/admin-dashboard',
      superadmin: '/super-admin-dashboard'
    };

    this.router.navigate([routes[role] || '/login']);

  }

  goToLogin() {
    this.router.navigate(['/login']);
  }

}