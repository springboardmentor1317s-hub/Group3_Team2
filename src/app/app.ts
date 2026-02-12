import { Component } from '@angular/core';
import { EventOrganizerDashboard } from './event-organizer-dashboard/event-organizer-dashboard';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [EventOrganizerDashboard],
  templateUrl: './app.html',
})
export class App {}
