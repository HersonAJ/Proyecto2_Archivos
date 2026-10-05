import { HttpErrorResponse } from '@angular/common/http';

export function mensajeDeError(
  error: unknown,
  porDefecto = 'Ocurrió un error inesperado',
): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) return 'No se pudo conectar con el servidor';
    const mensaje = (error.error as { message?: string | string[] } | null)?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string') return mensaje;
  }
  return porDefecto;
}