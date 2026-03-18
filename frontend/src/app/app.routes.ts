import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { EventOrganizerDashboardComponent } from './pages/event-organizer-dashboard/event-organizer-dashboard.component';
import { SuperAdminDashboardComponent } from './pages/super-admin-dashboard/super-admin-dashboard.component';

export const routes: Routes = [
  // Public
  { path: '', component: HomeComponent },
  { path: 'home', component: HomeComponent },

  // Auth
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },

  // Dashboards (guards temporarily disabled for testing)
  { path: 'student-dashboard', component: StudentDashboardComponent },
  { path: 'admin-dashboard', component: EventOrganizerDashboardComponent },
  { path: 'super-admin-dashboard', component: SuperAdminDashboardComponent },

  // Fallback
  { path: '**', redirectTo: '' }
];
