import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { Router, RouterModule } from '@angular/router';
import { MatIconModule } from '@angular/material/icon';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    CommonModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent {

  registerForm: FormGroup;
  errorMessage = '';

  user = {
    fullName: '',
    email: '',
    college: '',
    role: '',
    password: '',
    confirmPassword: ''
  };

  constructor(
    private fb: FormBuilder,
    private router: Router,
    private authService: AuthService
  ) {
    this.registerForm = this.fb.group({
      name: ['', Validators.required],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      role: ['', Validators.required]
    });
  }

  register() {
    // Validation: all fields required
    if (!this.user.fullName || !this.user.email || !this.user.college || !this.user.role || !this.user.password || !this.user.confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    // Validation: passwords must match
    if (this.user.password !== this.user.confirmPassword) {
      alert("Passwords do not match");
      return;
    }

    // Prepare user data to send to backend
    const userData = {
      fullName: this.user.fullName,
      email: this.user.email,
      college: this.user.college,
      role: this.user.role,
      password: this.user.password
    };

    // Clear any previous error messages
    this.errorMessage = '';

    // Call AuthService to register
    this.authService.register(userData).subscribe({
      next: (res: any) => {
        alert(res.message || "Registration successful!");

        // Save token and user info (including email)
        if (res.token) {
          this.authService.saveUserData(
            res.token,
            res.role,
            res.fullName,
            res.email  // Pass email here
          );

          // Redirect based on role
          this.redirectBasedOnRole(res.role);
        } else {
          // If no token (maybe email verification required), go to login
          this.router.navigate(['/login']);
        }
      },
      error: (err) => {
        // Show error natively on the form instead of an alert
        this.errorMessage = err.error?.message || "Registration failed. Please try again.";
      }
    });
  }

  // Helper method for role-based redirection
  private redirectBasedOnRole(role: string): void {
    switch (role) {
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
        this.router.navigate(['/login']);
    }
  }
}