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

  // onSubmit() {
  //   if (this.registerForm.invalid) return;

  //   this.authService.register(this.registerForm.value)
  //     .subscribe({
  //       next: () => {
  //         alert('Registration successful');
  //         this.router.navigate(['/dashboard']);
  //       },
  //       error: (err) => {
  //         this.errorMessage = err.error.message || 'Registration failed';
  //       }
  //     });
  // }

  register() {

    // Validation: all fields required
    if (!this.user.fullName || !this.user.email || !this.user.college || !this.user.role || !this.user.password || !this.user.confirmPassword) {
      alert("Please fill all fields");
      return;
    }

    // Validation: passwords must match
    if (this.user.password !== this.user.confirmPassword) {
      alert("Invalid Credentials");
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

    // Call AuthService to register
    this.authService.register(userData).subscribe({
      next: (res: any) => {
        // Show success message
        alert(res.message || "Registration successful!");

        // Use updated AuthService method to store token and user info
        this.authService.saveUserData(res.token, res.role, res.fullName);

        // Redirect user to dashboard/homepage
        this.router.navigate(['/dashboard']); 
      },
      error: (err) => {
        alert(err.error?.message || "Registration failed");
      }
    });
  }
}