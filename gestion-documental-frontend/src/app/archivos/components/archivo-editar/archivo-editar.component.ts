import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ActualizarArchivoDto, Archivo } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';

export interface DatosArchivoEditar {
  archivo: Archivo;
}

function parsearEtiquetas(texto: string): string[] {
  return [
    ...new Set(
      texto
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter((e) => e.length > 0),
    ),
  ];
}

function extensionValida(control: AbstractControl): ValidationErrors | null {
  const nombre = String(control.value ?? '').trim().toLowerCase();
  return nombre.endsWith('.txt') || nombre.endsWith('.md') ? null : { extension: true };
}

function etiquetasValidas(control: AbstractControl): ValidationErrors | null {
  const lista = parsearEtiquetas(String(control.value ?? ''));
  if (lista.length > 10) return { demasiadas: true };
  if (lista.some((e) => e.length > 30)) return { largas: true };
  return null;
}

@Component({
  selector: 'app-archivo-editar',
  imports: [ReactiveFormsModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './archivo-editar.component.html',
  styleUrl: './archivo-editar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoEditarComponent {
  protected readonly datos = inject<DatosArchivoEditar>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<ArchivoEditarComponent, boolean>>(MatDialogRef);
  private readonly archivosService = inject(ArchivosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: [
      this.datos.archivo.nombre,
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(255), extensionValida],
    ],
    etiquetas: [this.datos.archivo.etiquetas.join(', '), [Validators.maxLength(400), etiquetasValidas]],
  });
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const original = this.datos.archivo;
    const valores = this.formulario.getRawValue();
    const nombre = valores.nombre.trim();
    const etiquetas = parsearEtiquetas(valores.etiquetas);
    const cambios: ActualizarArchivoDto = {};
    if (nombre !== original.nombre) cambios.nombre = nombre;
    if (etiquetas.join('|') !== original.etiquetas.join('|')) cambios.etiquetas = etiquetas;

    if (Object.keys(cambios).length === 0) {
      this.dialogRef.close(false);
      return;
    }

    this.enviando.set(true);
    this.error.set(null);
    this.archivosService
      .actualizar(original._id, cambios)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => this.dialogRef.close(true),
        error: (e: unknown) => {
          this.enviando.set(false);
          this.error.set(mensajeDeError(e, 'No se pudieron guardar los cambios'));
        },
      });
  }
}