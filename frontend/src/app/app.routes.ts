import { Routes } from '@angular/router';
import { HomeComponent } from './pages/home/home.component';
import { LoginComponent } from './pages/login/login.component';
import { RegisterComponent } from './pages/register/register.component';
import { StudentDashboardComponent } from './pages/student-dashboard/student-dashboard.component';
import { EventOrganizerDashboardComponent} from './pages/event-organizer-dashboard/event-organizer-dashboard.component';
import { authGuard } from './guards/auth.guard';
import { roleGuard } from './guards/role.guard';


export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'login', component: LoginComponent },
  { path: 'register', component: RegisterComponent },
  {
    path: 'student-dashboard',
    component: StudentDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'student' }
  },
  {
    path: 'admin-dashboard',
    component: EventOrganizerDashboardComponent,
    canActivate: [authGuard, roleGuard],
    data: { role: 'college-admin' }
  },
  { path: '**', redirectTo: '' }
];