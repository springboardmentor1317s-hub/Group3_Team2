import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ReactiveFormsModule, FormBuilder, Validators, FormGroup} from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import Swal from 'sweetalert2';
import { OnInit } from '@angular/core';
//import { EventService } from '../../services/event.service';

@Component({
  selector: 'app-event-form',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './event-form.component.html',
  styleUrl: './event-form.component.css'
})
export class EventFormComponent implements OnInit {

eventForm: FormGroup;
isSubmitting = false;
successMessage = '';

  categoryImages: { [key:string]: string } = {
    'Technical': 'https://blog.hightechcampus.com/hubfs/Philipp.jpg',
    'Cultural': 'https://eventfilnalweb.vercel.app/cu.jpeg',
    'Sports': 'https://eventfilnalweb.vercel.app/ko.jpg',
    'Workshop': 'https://www.shutterstock.com/image-photo/young-woman-speaker-giving-talk-600nw-2470953487.jpg'
  };

constructor(private fb: FormBuilder, private http: HttpClient, private router: Router) {
  this.eventForm = this.fb.group({
    title: ['', Validators.required],
    description: ['', Validators.required],
    startDate: ['', Validators.required],
    endDate: ['', Validators.required],
    category: ['', Validators.required],
    location: ['', Validators.required],
    college: ['', Validators.required],
    maxParticipants: ['', [Validators.required, Validators.min(1)]],
    imageUrl: ['']
  });
}

ngOnInit(): void {
  this.eventForm.get('category')?.valueChanges.subscribe(value => {
    const imageUrl = this.categoryImages[value];
    if (imageUrl) {
      this.eventForm.patchValue({
        imageUrl: imageUrl
      });
    }
  });
}

onSubmit() {
  if (this.eventForm.invalid) return;
  this.isSubmitting = true;

  /*const eventData = {
    ...this.eventForm.value,
    title: this.eventForm.value.title || "Default Title",
    description: this.eventForm.value.description || "Default Description",
    created_by: "69a426caae6aa743060df7a0"
  };*/

  this.http.post('http://localhost:5000/api/events/create', this.eventForm.value)
  .subscribe({
    next: (res: any) => {
      Swal.fire('Success!', 'Event Created Successfully', 'success');
      this.eventForm.reset();
      this.isSubmitting = false;
      this.router.navigate(['/admin/events']);
    },
    error: (err) => {
      this.isSubmitting = false;
      console.error("Database Error:", err);
      Swal.fire('Error!', 'Something went wrong', 'error');
    }
  });
}

get f() {
    return this.eventForm.controls;
  }

  
}