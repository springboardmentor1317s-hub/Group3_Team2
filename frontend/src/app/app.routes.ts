import { Routes } from '@angular/router';
import { roleGuard, guestGuard } from './guards/auth.guard';

import { HomeComponent }                    from './pages/home/home.component';
import { LoginComponent }                   from './pages/login/login.component';
import { RegisterComponent }                from './pages/register/register.component';
import { StudentDashboardComponent }        from './pages/student-dashboard/student-dashboard.component';
import { EventOrganizerDashboardComponent } from './pages/event-organizer-dashboard/event-organizer-dashboard.component';
import { SuperAdminDashboardComponent }     from './pages/super-admin-dashboard/super-admin-dashboard.component';

export const routes: Routes = [
  // Public
  { path: '',     component: HomeComponent },
  { path: 'home', component: HomeComponent },

  // Guest-only
  { path: 'login',    component: LoginComponent,    canActivate: [guestGuard] },
  { path: 'register', component: RegisterComponent, canActivate: [guestGuard] },

  // Protected
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [roleGuard('student')]
  },
  {
    path: 'admin-dashboard',
    component: EventOrganizerDashboardComponent,
    canActivate: [roleGuard('college-admin')]
  },
  {
    path: 'super-admin-dashboard',
    component: SuperAdminDashboardComponent,
    canActivate: [roleGuard('superadmin')]
  },

  // Fallback
  { path: '**', redirectTo: '' }
];
