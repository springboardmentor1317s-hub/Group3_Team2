import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { EventOrganizerDashboardComponent } from './pages/event-organizer-dashboard/event-organizer-dashboard.component';
import { SuperAdminDashboardComponent } from './pages/super-admin-dashboard/super-admin-dashboard.component';
import { EventListComponent } from './pages/event-list/event-list.component';
import { EventFormComponent } from './pages/event-form/event-form.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';

export const routes: Routes = [
  // Public routes
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  
  // Student Dashboard - only accessible by students
  { 
    path: 'student-dashboard', 
    component: StudentDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'student' }
  },
  
  // College Admin Dashboard - only accessible by college-admin
  { 
    path: 'admin-dashboard', 
    component: EventOrganizerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'college-admin' }
  },
  
  // Super Admin Dashboard - only accessible by superadmin
  { 
    path: 'super-admin-dashboard', 
    component: SuperAdminDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'superadmin' }
  },

   { 
    path: 'events', 
    component: EventListComponent,
    canActivate: [authGuard]  // Anyone logged in can view
  },
   { 
    path: 'events/create', 
    component: EventFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'college-admin' }  // Only admins can create
  },
  { 
    path: 'events/edit/:id', 
    component: EventFormComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'college-admin' }  // Only admins can edit
  },
  
  // Redirect any unknown routes to home
  { path: '**', redirectTo: '' }
];