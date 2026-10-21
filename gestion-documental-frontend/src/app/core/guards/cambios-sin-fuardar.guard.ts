import { inject } from '@angular/core';
import { CanDeactivateFn } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';
import { map } from 'rxjs';
import { ConfirmarComponent } from '../../shared/components/confirmar/confirmar.component';

export interface ConCambiosSinGuardar {
  tieneCambiosSinGuardar(): boolean;
}

export const cambiosSinGuardarGuard: CanDeactivateFn<ConCambiosSinGuardar> = (componente) => {
  if (!componente.tieneCambiosSinGuardar()) return true;

  return inject(MatDialog)
    .open(ConfirmarComponent, {
      width: '420px',
      data: {
        titulo: 'Cambios sin guardar',
        mensaje: 'Si sales ahora, perderás los cambios que no has guardado.',
        boton: 'Salir sin guardar',
        peligro: true,
      },
    })
    .afterClosed()
    .pipe(map((confirmado) => confirmado === true));
};