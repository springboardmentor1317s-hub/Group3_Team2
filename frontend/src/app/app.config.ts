import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),

    // HttpClient for API calls to backend
    provideHttpClient(withInterceptorsFromDi()),

    // Needed for ngModel in forms (login/signup)
    importProvidersFrom(FormsModule)
  ]
};