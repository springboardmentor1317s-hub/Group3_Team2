import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators, FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
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
    MatSelectModule,
    MatIconModule,
    RouterModule
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent {

  errorMessage: string = '';

  email = '';
  password = '';
  role = '';

  constructor(private router: Router, private authService: AuthService) {}

  login() {
    // Validate all fields
    if (!this.email || !this.password || !this.role) {
      alert('Please fill all fields');
      return;
    }

    const loginData = {
      email: this.email.trim(),
      password: this.password,
      role: this.role
    };

    // Call backend login API
    this.authService.login(loginData).subscribe({
      next: (res: any) => {
        if (!res || !res.token) {
          alert('Login failed: Invalid response from server');
          return;
        }

        // Show success message
        alert(res.message || 'Login successful!');

        // Save token, role, and fullName
        this.authService.saveUserData(res.token, res.role, res.fullName);

        // Redirect based on role
        switch (res.role) {
          case 'student':
            this.router.navigate(['/student-dashboard']);
            break;
          case 'college-admin':
            this.router.navigate(['/admin-dashboard']);
            break;
          case 'super-admin':
            this.router.navigate(['/admin-dashboard']); // Or another page if needed
            break;
          default:
            alert('Unknown role. Cannot redirect.');
            break;
        }
      },
      error: (err) => {
        console.error(err);
        // 🔹 Display error message from backend if available
        alert(err.error?.message || 'Login failed. Please check your credentials and role.');
      }
    });
  }
}