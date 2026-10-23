import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { Usuario } from '../../../usuarios/models/usuario.model';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { ComparticionRecibida } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-comparticiones-recibidas',
  imports: [
    DatePipe,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './comparticiones-recibidas.component.html',
  styleUrl: './comparticiones-recibidas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparticionesRecibidasComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly autenticacion = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly esAdmin = computed(() => this.autenticacion.usuario()?.rol === 'ADMIN');

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly comparticiones = signal<ComparticionRecibida[]>([]);

  protected readonly usuarios = signal<Usuario[]>([]);
  protected readonly usuarioSeleccionado = signal<string | null>(null);

  constructor() {
    const yo = this.autenticacion.usuario();
    if (yo) this.usuarioSeleccionado.set(yo.id);

    if (this.esAdmin()) {
      this.cargarUsuarios();
    } else {
      this.cargar();
    }
  }

  protected volver() {
    void this.router.navigate(['/reportes']);
  }

  protected cambiarUsuario(usuarioId: string) {
    this.usuarioSeleccionado.set(usuarioId);
    this.cargar();
  }

  private cargarUsuarios() {
    this.usuariosService.listar().subscribe({
      next: (lista) => {
        this.usuarios.set(lista);
        const seleccionado = this.usuarioSeleccionado() ?? lista[0]?._id ?? null;
        this.usuarioSeleccionado.set(seleccionado);
        this.cargar();
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar la lista de usuarios'));
      },
    });
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    const usuarioId = this.esAdmin() ? this.usuarioSeleccionado() ?? undefined : undefined;
    this.reportesService.comparticionesRecibidas(usuarioId).subscribe({
      next: (datos) => {
        this.comparticiones.set(datos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
      },
    });
  }
}