import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, RouterModule, RouterOutlet, RouterLink, RouterLinkActive],
  template: `
    <div class="app-container">
      <nav class="navbar">
        <div class="nav-brand">
          <h2>🎓 Campus Event Hub</h2>
        </div>
        <div class="nav-menu">
          <a routerLink="/student" routerLinkActive="active" class="nav-link">
            Student Dashboard
          </a>
          <a routerLink="/organizer" routerLinkActive="active" class="nav-link">
            Organizer Dashboard
          </a>
        </div>
      </nav>
      
      <div class="content">
        <router-outlet></router-outlet>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }

    .navbar {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 1rem 2rem;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
    }

    .nav-brand h2 {
      margin: 0;
      font-size: 1.5rem;
    }

    .nav-menu {
      display: flex;
      gap: 1rem;
    }

    .nav-link {
      color: white;
      text-decoration: none;
      padding: 0.5rem 1.5rem;
      border-radius: 25px;
      transition: all 0.3s;
      font-weight: 500;
    }

    .nav-link:hover {
      background: rgba(255,255,255,0.2);
    }

    .nav-link.active {
      background: rgba(255,255,255,0.3);
      font-weight: 600;
    }

    .content {
      flex: 1;
      background: #f5f7fb;
    }
  `]
})
export class AppComponent {
  title = 'campus-event-hub';
}