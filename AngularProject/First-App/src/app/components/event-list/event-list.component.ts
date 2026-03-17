import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-event-list',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './event-list.component.html',
  styleUrl: './event-list.component.css'
})
export class EventListComponent implements OnInit {

  events: any[] = [];
  isLoading = false;

  constructor(private eventService: EventService) {}

  ngOnInit(): void {
    this.loadEvents();
  }

  loadEvents() {
    this.isLoading = true;
    this.eventService.getEvents().subscribe({
      next: (res: any) => {
        this.events = res;
        this.isLoading = false;
      }

      /*this.eventService.createEvent(this.eventForm.value).subscribe(() => {
        Swal.fire('Success!', 'Event Created Successfully', 'success')
        .then(() => {
          this.router.navigate(['/admin/events']);
        });
      });*/
      
    });
  }

  deleteEvent(id: string) {
    if(confirm('Are you sure you want to delete?')) {
      this.eventService.deleteEvent(id).subscribe(() => {
        this.loadEvents();
      });
    }
  }


}
