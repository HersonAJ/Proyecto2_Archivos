import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Observable } from 'rxjs';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ActualizarUsuario, RolUsuario, Usuario } from '../../models/usuario.model';
import { UsuariosService } from '../../services/usuarios.service';

export interface DatosUsuarioForm {
  usuario?: Usuario;
  esPropio?: boolean;
}

@Component({
  selector: 'app-usuario-form',
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
  ],
  templateUrl: './usuario-form.component.html',
  styleUrl: './usuario-form.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioFormComponent {
  protected readonly datos = inject<DatosUsuarioForm>(MAT_DIALOG_DATA);
  private readonly dialogRef = inject<MatDialogRef<UsuarioFormComponent, boolean>>(MatDialogRef);
  private readonly usuariosService = inject(UsuariosService);
  private readonly destroyRef = inject(DestroyRef);

  protected readonly esEdicion = this.datos.usuario !== undefined;

  protected readonly formulario = inject(FormBuilder).nonNullable.group({
    nombre: [
      this.datos.usuario?.nombre ?? '',
      [Validators.required, Validators.pattern(/\S/), Validators.maxLength(100)],
    ],
    correo: [this.datos.usuario?.correo ?? '', [Validators.required, Validators.email]],
    password: [
      '',
      this.esEdicion
        ? [Validators.minLength(6), Validators.maxLength(72)]
        : [Validators.required, Validators.minLength(6), Validators.maxLength(72)],
    ],
    rol: [this.datos.usuario?.rol ?? ('USUARIO' as RolUsuario), Validators.required],
  });

  protected readonly ocultarPassword = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    if (this.datos.esPropio) this.formulario.controls.rol.disable();
  }

  protected guardar() {
    if (this.formulario.invalid) {
      this.formulario.markAllAsTouched();
      return;
    }

    const valores = this.formulario.getRawValue();
    const nombre = valores.nombre.trim();
    const correo = valores.correo.trim();

    let peticion: Observable<unknown>;
    if (this.datos.usuario) {
      const original = this.datos.usuario;
      const cambios: ActualizarUsuario = {};
      if (nombre !== original.nombre) cambios.nombre = nombre;
      if (correo.toLowerCase() !== original.correo) cambios.correo = correo;
      if (valores.rol !== original.rol) cambios.rol = valores.rol;
      if (valores.password) cambios.password = valores.password;

      if (Object.keys(cambios).length === 0) {
        this.dialogRef.close(false);
        return;
      }
      peticion = this.usuariosService.actualizar(original._id, cambios);
    } else {
      peticion = this.usuariosService.crear({
        nombre,
        correo,
        password: valores.password,
        rol: valores.rol,
      });
    }

    this.enviando.set(true);
    this.error.set(null);
    peticion.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo guardar el usuario'));
      },
    });
  }
}