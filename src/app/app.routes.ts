import { Routes } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from './services/auth.service';

export const routes: Routes = [
  // Default redirect to login (once login exists)
  { path: '', redirectTo: '/student', pathMatch: 'full' },
  
  // Student Dashboard - only for students
  { 
    path: 'student', 
    loadComponent: () => import('./student-dashboard/student-dashboard').then(m => m.DashboardComponent),
    canActivate: [() => {
      const auth = inject(AuthService);
      const role = auth.getRole();
      if (auth.isLoggedIn() && role === 'student') {
        return true;
      }
      // Redirect to login if not authorized
      window.location.href = '/login';
      return false;
    }]
  },
  
  // College Admin Dashboard - only for admins
  { 
    path: 'admin', 
    loadComponent: () => import('./event-organizer-dashboard/event-organizer-dashboard').then(m => m.EventOrganizerDashboard),
    canActivate: [() => {
      const auth = inject(AuthService);
      console.log('Admin guard checking...');
      const role = auth.getRole();
      console.log('Role from guard:', role);
      if (auth.isLoggedIn() && (role === 'college_admin' || role === 'admin')) {
       
         console.log('Admin access GRANTED to admin');
        return true;
      }
      // Redirect to login if not authorized
      console.log('Access DENIED, redirecting to student');
      window.location.href = '/student';
      return false;
    }]
  },
  
  // Login route - ready for teammate's component
  //{ 
    //path: 'login', 
    //loadComponent: () => import('./auth/login/login').then(m => m.LoginComponent)
  //},
  
  // Wildcard - redirect to student
  { path: '**', redirectTo: '/student' }
];