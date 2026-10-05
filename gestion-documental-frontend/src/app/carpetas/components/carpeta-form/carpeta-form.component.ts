import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../core/utils/mensaje-error';

export interface DatosCarpetaForm {
  titulo: string;
  boton: string;
  nombre: string;
  guardar: (nombre: string) => Observable<unknown>;
}

@Component({
  selector: 'app-carpeta-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './carpeta-form.component.html',
  styleUrl: './carpeta-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpetaFormComponent {
  // Datos que nos entrega quien abre el diálogo
  protected readonly datos = inject<DatosCarpetaForm>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<CarpetaFormComponent, boolean>>(MatDialogRef);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: [
      this.datos.nombre,
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
    ],
  });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);

    const nombre = this.formulario.controls.nombre.value.trim();
    this.datos.guardar(nombre).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}