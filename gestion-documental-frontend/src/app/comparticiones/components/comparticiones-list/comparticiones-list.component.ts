import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';
import { ArchivosService } from '../../../archivos/service/archivos.service';
import { guardarBlob } from '../../../core/utils/descarga';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ConfirmarComponent } from '../../../shared/components/confirmar/confirmar.component';
import { ElementoCompartido, NIVELES, NivelPermiso, etiquetaNivel } from '../../models/comparticion.model';
import { ComparticionesService } from '../../service/comparticiones.service';

@Component({
  selector: 'app-comparticion-list',
  imports: [
    DatePipe,
    RouterLink,
    MatTabsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './comparticiones-list.component.html',
  styleUrl:    './comparticiones-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ComparticionListComponent {
  private readonly comparticionesService = inject(ComparticionesService);
  private readonly archivosService = inject(ArchivosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly niveles = NIVELES;
  protected readonly etiquetaNivel = etiquetaNivel;
  protected readonly recibidas = signal<ElementoCompartido[]>([]);
  protected readonly otorgadas = signal<ElementoCompartido[]>([]);
  protected readonly cargando = signal(true);
  protected readonly procesando = signal(false);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  protected icono(elemento: ElementoCompartido): string {
    if (elemento.tipoRecurso === 'CARPETA') return 'folder';
    return elemento.recurso.tipo === 'md' ? 'description' : 'text_snippet';
  }

  protected tipo(elemento: ElementoCompartido): string {
    if (elemento.tipoRecurso === 'CARPETA') return 'Carpeta';
    return elemento.recurso.tipo ? `.${elemento.recurso.tipo}` : 'Archivo';
  }

  protected descargar(elemento: ElementoCompartido) {
    this.archivosService.obtenerContenido(elemento.recurso._id, true).subscribe({
      next: ({ blob, nombreArchivo }) => guardarBlob(blob, nombreArchivo ?? elemento.recurso.nombre),
      error: (e: unknown) => this.avisar(mensajeDeError(e, 'Error al descargar'), 4000),
    });
  }

  protected cambiarNivel(elemento: ElementoCompartido, nivel: NivelPermiso) {
    this.comparticionesService.cambiarNivel(elemento._id, nivel).subscribe({
      next: () =>
        this.otorgadas.update((lista) =>
          lista.map((e) => (e._id === elemento._id ? { ...e, nivel } : e)),
        ),
      error: (e: unknown) => {
        this.avisar(mensajeDeError(e, 'No se pudo cambiar el permiso'), 4000);
        this.cargar(); // se vuelve a mostrar el valor real
      },
    });
  }

  protected retirar(elemento: ElementoCompartido) {
    const persona = elemento.destinatario?.nombre ?? 'esa persona';
    this.dialog
      .open(ConfirmarComponent, {
        width: '420px',
        data: {
          titulo: 'Quitar acceso',
          mensaje: `«${persona}» dejará de tener acceso a «${elemento.recurso.nombre}».`,
          boton: 'Quitar acceso',
        },
      })
      .afterClosed()
      .subscribe((confirmado) => {
        if (!confirmado) return;
        this.procesando.set(true);
        this.comparticionesService.retirar(elemento._id).subscribe({
          next: () => {
            this.procesando.set(false);
            this.otorgadas.update((lista) => lista.filter((e) => e._id !== elemento._id));
            this.avisar('Acceso retirado');
          },
          error: (e: unknown) => {
            this.procesando.set(false);
            this.avisar(mensajeDeError(e, 'No se pudo retirar el acceso'), 4000);
          },
        });
      });
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      recibidas: this.comparticionesService.recibidas(),
      otorgadas: this.comparticionesService.otorgadas(),
    }).subscribe({
      next: ({ recibidas, otorgadas }) => {
        this.recibidas.set(recibidas);
        this.otorgadas.set(otorgadas);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudieron cargar los elementos compartidos'));
      },
    });
  }

  private avisar(mensaje: string, duracion = 3000) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: duracion });
  }
}