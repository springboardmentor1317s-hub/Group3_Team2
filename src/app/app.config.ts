<<<<<<< Updated upstream
import { ApplicationConfig, provideZoneChangeDetection } from '@angular/core';
=======
import { ApplicationConfig } from '@angular/core';
>>>>>>> Stashed changes
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
<<<<<<< Updated upstream
  providers: [provideZoneChangeDetection({ eventCoalescing: true }), provideRouter(routes)]
};
=======
  providers: [
    provideRouter(routes)
  ]
};
>>>>>>> Stashed changes
