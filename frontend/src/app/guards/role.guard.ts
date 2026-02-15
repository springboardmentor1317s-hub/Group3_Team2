import { inject } from '@angular/core';
import { CanActivateFn, ActivatedRouteSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {

  const authService = inject(AuthService);
  const router = inject(Router);

  const expectedRole = route.data?.['role'];
  const userRole = authService.getRole();

  if (userRole !== expectedRole) {
    router.navigate(['/login']);
    return false;
  }

  return true;
};
