import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ConfirmarComponent } from '../../../shared/components/confirmar/confirmar.component';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { Usuario } from '../../models/usuario.model';
import { UsuariosService } from '../../services/usuarios.service';
import { DatosUsuarioForm, UsuarioFormComponent } from '../usuario-form/usuario-form.component';

@Component({
  selector: 'app-usuario-list',
  imports: [
    DatePipe,
    TamanoPipe,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './usuario-list.component.html',
  styleUrl: './usuario-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UsuarioListComponent {
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly idPropio = inject(AuthService).usuario()?.id;

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly cargando = signal(true);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected esPropio(usuario: Usuario): boolean {
    return usuario._id === this.idPropio;
  }

  protected etiquetaRol(usuario: Usuario): string {
    return usuario.rol === 'ADMIN' ? 'Administrador' : 'Usuario';
  }

  protected nuevo() {
    this.abrirFormulario({}, 'Usuario creado');
  }

  protected editar(usuario: Usuario) {
    this.abrirFormulario({ usuario, esPropio: this.esPropio(usuario) }, 'Usuario actualizado');
  }

  protected desactivar(usuario: Usuario) {
    this.dialog
      .open(ConfirmarComponent, {
        width: '420px',
        data: {
          titulo: 'Desactivar usuario',
          mensaje: `«${usuario.nombre}» no podrá iniciar sesión, pero se conservarán sus archivos y su historial.`,
          boton: 'Desactivar',
          peligro: true,
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (confirmado) this.cambiarEstado(usuario, false);
      });
  }

  protected activar(usuario: Usuario) {
    this.cambiarEstado(usuario, true);
  }

  private cambiarEstado(usuario: Usuario, activo: boolean) {
    const peticion = activo
      ? this.usuariosService.activar(usuario._id)
      : this.usuariosService.desactivar(usuario._id);

    this.procesando.set(true);
    peticion.subscribe({
      next: () => {
        this.procesando.set(false);
        this.avisar(`«${usuario.nombre}» ${activo ? 'activado' : 'desactivado'}`);
        this.cargar();
      },
      error: (e: unknown) => {
        this.procesando.set(false);
        this.avisar(mensajeDeError(e, 'No se pudo cambiar el estado'), 5000);
      },
    });
  }

  private abrirFormulario(datos: DatosUsuarioForm, mensaje: string) {
    this.dialog
      .open(UsuarioFormComponent, { width: '460px', data: datos })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) {
          this.avisar(mensaje);
          this.cargar();
        }
      });
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.usuariosService.listar().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudieron cargar los usuarios'));
      },
    });
  }

  private avisar(mensaje: string, duracion = 3500) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: duracion });
  }
}