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

        // Save token and role (role comes from DB)
        this.authService.saveUserData(
          res.token,
          res.role,
          res.fullName
        );

        // Redirect based on role
        if (res.role === 'student') {
          this.router.navigate(['/student-dashboard']);
        } else if (res.role === 'college-admin') {
          this.router.navigate(['/admin-dashboard']);
        } else if (res.role === 'super-admin') {
          this.router.navigate(['/admin-dashboard']);
        } else {
          this.errorMessage = 'Unknown role.';
        }
      },
      error: (err) => {
        this.errorMessage =
          err?.error?.message ||
          'Login failed. Please check your credentials.';
      }
    });
  }
}


// import { Component } from '@angular/core';
// import { Router } from '@angular/router';
// import { FormsModule } from '@angular/forms';
// import { CommonModule } from '@angular/common';
// import { MatCardModule } from '@angular/material/card';
// import { MatFormFieldModule } from '@angular/material/form-field';
// import { MatInputModule } from '@angular/material/input';
// import { MatButtonModule } from '@angular/material/button';
// import { MatSelectModule } from '@angular/material/select';
// import { MatIconModule } from '@angular/material/icon';
// import { RouterLink, RouterModule } from '@angular/router';
// import { AuthService } from '../../services/auth.service';

// @Component({
//   selector: 'app-login',
//   standalone: true,
//   imports: [
//     CommonModule,
//     FormsModule,
//     RouterLink,
//     MatCardModule,
//     MatFormFieldModule,
//     MatInputModule,
//     MatButtonModule,
//     MatSelectModule,
//     MatIconModule,
//     RouterModule
//   ],
//   templateUrl: './login.component.html',
//   styleUrls: ['./login.component.css']
// })
// export class LoginComponent {

//   email: string = '';
//   password: string = '';
//   role: string = '';
//   errorMessage: string = '';

//   constructor(private router: Router, private authService: AuthService) {}

//   login() {

//     this.errorMessage = '';

//     // Trim email
//     const trimmedEmail = this.email.trim();

//     // Validate fields
//     if (!trimmedEmail || !this.password || !this.role) {
//       this.errorMessage = 'All fields are required.';
//       return;
//     }

//     const loginData = {
//       email: trimmedEmail,
//       password: this.password,
//       role: this.role
//     };

//     this.authService.login(loginData).subscribe({
//       next: (res: any) => {

//         if (!res?.token) {
//           this.errorMessage = 'Invalid server response.';
//           return;
//         }

//         // Save user data
//         this.authService.saveUserData(
//           res.token,
//           res.role,
//           res.fullName
//         );

//         // Redirect based on role
//         if (res.role === 'student') {
//           this.router.navigate(['/student-dashboard']);
//         } else if (res.role === 'college-admin') {
//           this.router.navigate(['/admin-dashboard']);
//         } else if (res.role === 'super-admin') {
//           this.router.navigate(['/admin-dashboard']);
//         } else {
//           this.errorMessage = 'Invalid role received.';
//         }
//       },
//       error: (err) => {
//         this.errorMessage =
//           err?.error?.message ||
//           'Login failed. Please check your credentials.';
//       }
//     });
//   }
// }
