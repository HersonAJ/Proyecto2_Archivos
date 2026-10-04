import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auntenticacion/services/auth.service';

export const authGuard: CanActivateFn = () => {
  const autenticacion = inject(AuthService);
  const router = inject(Router);
  return autenticacion.estaAutenticado() ? true : router.createUrlTree(['/login']);
};