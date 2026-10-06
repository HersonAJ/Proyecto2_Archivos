import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { BehaviorSubject, catchError, map, of, switchMap, tap } from 'rxjs';
import { DatePipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';

import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { Archivo, TipoArchivo, OrdenArchivo, SentidoOrden } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';
import { ArchivoFormComponent, DatosArchivoForm } from '../archivo-form/archivo-form.component';

@Component({
  selector: 'app-archivo-list',
  imports: [
    DatePipe, TamanoPipe,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './archivo-list.component.html',
  styleUrl: './archivo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoListComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly archivosService = inject(ArchivosService);
  private readonly dialog = inject(MatDialog);

  // Carpeta cuyos archivos se muestran (null = raíz). La entrega el componente padre.
  // input() es una señal de solo lectura que se actualiza cuando el padre cambia el valor.
  readonly carpetaId = input<string | null>(null);

  protected readonly archivos = signal<Archivo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);

  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);

  // Cada vez que se emite un valor aquí, se vuelve a cargar la lista
  private readonly recarga = new BehaviorSubject<void>(undefined);

  constructor() {
    // toObservable convierte la señal en un flujo: emite cada vez que cambia la carpeta
    toObservable(this.carpetaId)
      .pipe(
        // Al cambiar de carpeta se vuelve a la primera página
        tap(() => this.pagina.set(1)),
        // Cada vez que "recarga" emite, se pide de nuevo la lista de ESTA carpeta
        switchMap((id) => this.recarga.pipe(map(() => id))),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.archivosService
            .listar({
              carpeta: id,
              pagina: this.pagina(),
              limite: this.limite(),
              orden: OrdenArchivo.CREADO,
              sentido: SentidoOrden.DESC,
            })
            .pipe(
              // El error se atrapa aquí para que no termine la suscripción principal
              catchError((e: unknown) => {
                this.error.set(mensajeDeError(e, 'No se pudieron cargar los archivos'));
                return of(null);
              }),
            ),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((respuesta) => {
        this.cargando.set(false);
        if (respuesta) {
          this.archivos.set(respuesta.datos);
          this.total.set(respuesta.total);
        } else {
          this.archivos.set([]);
          this.total.set(0);
        }
      });
  }

  // Los siguientes dos métodos son públicos: los usa el componente padre desde su barra superior
  recargar() {
    this.recarga.next();
  }

  subirArchivo() {
    const datosForm: DatosArchivoForm = {
      titulo: 'Subir nuevo archivo',
      boton: 'Subir',
      guardar: (archivo: File, etiquetas: string) =>
        this.archivosService.subir(archivo, this.carpetaId() ?? undefined, etiquetas),
    };

    this.dialog
      .open(ArchivoFormComponent, { width: '440px', data: datosForm })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) {
          this.snackBar.open('Archivo subido con éxito', 'Cerrar', { duration: 3000 });
          this.recargar();
        }
      });
  }

  protected cambiarPagina(evento: PageEvent) {
    this.pagina.set(evento.pageIndex + 1);
    this.limite.set(evento.pageSize);
    this.recargar();
  }

  protected descargarArchivo(archivo: Archivo) {
    this.archivosService.obtenerContenido(archivo._id, true).subscribe({
      next: ({ blob, nombreArchivo }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo ?? archivo.nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);

        this.snackBar.open('Archivo descargado con éxito', 'Cerrar', { duration: 3000 });
      },
      error: (e: unknown) => {
        this.snackBar.open(mensajeDeError(e, 'Error al descargar'), 'Cerrar', { duration: 4000 });
      },
    });
  }

  protected esMarkdown(archivo: Archivo): boolean {
    return archivo.tipo === TipoArchivo.MD;
  }

  protected obtenerIconoTipo(tipo: TipoArchivo): string {
    return tipo === TipoArchivo.MD ? 'description' : 'text_snippet';
  }
}