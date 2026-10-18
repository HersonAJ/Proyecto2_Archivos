import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';

export interface DatosConfirmar {
  titulo: string;
  mensaje: string;
  boton: string;
  peligro?: boolean;
}

@Component({
  selector: 'app-confirmar',
  imports: [MatDialogModule, MatButtonModule],
  templateUrl: './confirmar.component.html',
  styleUrl: './confirmar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmarComponent {
  protected readonly datos = inject<DatosConfirmar>(MAT_DIALOG_DATA);
}