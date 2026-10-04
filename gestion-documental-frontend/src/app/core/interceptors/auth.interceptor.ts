import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { environment } from '../../../environments/environment.development';
import { AuthService } from '../../auntenticacion/services/auth.service';

export const authInterceptor: HttpInterceptorFn = (
  peticion,
  siguiente,
) => {
  const autenticacion = inject(AuthService);
  const token = autenticacion.token();

  // El token solo se envía a nuestra API, nunca a otros sitios
  const enviar =
    token && peticion.url.startsWith(environment.apiUrl)
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return siguiente(enviar).pipe(
    catchError((error: unknown) => {
      const esLogin = peticion.url.endsWith('/auth/login');
      if (error instanceof HttpErrorResponse && error.status === 401 && !esLogin) {
        autenticacion.cerrarSesion();
      }
      return throwError(() => error);
    }),
  );
};