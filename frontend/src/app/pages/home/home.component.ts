import { Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, CommonModule],
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {
  private eventService = inject(EventService);
  testimonials: any[] = [];

  ngOnInit() {
    this.loadTestimonials();
  }

  loadTestimonials() {
    this.eventService.getPlatformFeedback().subscribe({
      next: (data) => {
        this.testimonials = data;
      },
      error: (err) => {
        console.error('Error loading testimonials:', err);
        // Fallback or leave empty
      }
    });
  }

  getStars(rating: number): string {
    return '★'.repeat(Math.round(rating)) + '☆'.repeat(5 - Math.round(rating));
  }

  getInitial(name: string): string {
    return name?.charAt(0)?.toUpperCase() || 'S';
  }
}

