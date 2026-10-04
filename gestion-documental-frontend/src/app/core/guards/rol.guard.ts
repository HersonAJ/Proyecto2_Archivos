import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../../auntenticacion/services/auth.service';
import { RolUsuario } from '../modelos/sesion.model';

export const rolGuard = (rolesPermitidos: RolUsuario[]): CanActivateFn => {
  return () => {
    const autenticacion = inject(AuthService);
    const router = inject(Router);
    const rol = autenticacion.usuario()?.rol;
    return rol && rolesPermitidos.includes(rol)
      ? true
      : router.createUrlTree(['/inicio']);
  };
};