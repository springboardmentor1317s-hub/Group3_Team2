import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app';
import { appConfig } from './app/app.config';
<<<<<<< Updated upstream
import { AppComponent } from './app/app.component';

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
=======

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
>>>>>>> Stashed changes
