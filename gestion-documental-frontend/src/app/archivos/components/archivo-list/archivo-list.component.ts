import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
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
import { MatToolbarModule } from '@angular/material/toolbar';

import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { Archivo, TipoArchivo, OrdenArchivo, SentidoOrden } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';
import { ArchivoFormComponent, DatosArchivoForm } from '../archivo-form/archivo-form.component';

@Component({
  selector: 'app-archivo-list',
  imports: [
    RouterLink, DatePipe, TamanoPipe,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
  ],
  templateUrl: './archivo-list.component.html',
  styleUrl: './archivo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly snackBar = inject(MatSnackBar);
  private readonly archivosService = inject(ArchivosService);
  private readonly dialog = inject(MatDialog);

  protected readonly carpetaActualId = signal<string | null>(null);
  protected readonly archivos = signal<Archivo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);

  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);
  private readonly recarga = new BehaviorSubject<void>(undefined);

  constructor() {
    this.route.paramMap
      .pipe(
        map((params) => params.get('id')),
        tap((id) => {
          this.carpetaActualId.set(id);
          this.pagina.set(1);
        }),
        switchMap((id) => this.recarga.pipe(map(() => id))),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          this.archivosService
            .listar({
              carpeta: id ?? null,
              pagina: this.pagina(),
              limite: this.limite(),
              orden: OrdenArchivo.CREADO,
              sentido: SentidoOrden.DESC,
            })
            .pipe(
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
        }
      });
  }

  protected cambiarPagina(evento: PageEvent) {
    this.pagina.set(evento.pageIndex + 1);
    this.limite.set(evento.pageSize);
    this.recarga.next();
  }

  protected descargarArchivo(archivo: Archivo) {
    this.cargando.set(true);
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

        this.cargando.set(false);
        this.snackBar.open('Archivo descargado con éxito', 'Cerrar', { duration: 3000 });
      },
      error: (e: unknown) => {
        this.cargando.set(false);
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

  protected subirArchivo() {
    const datosForm: DatosArchivoForm = {
      titulo: 'Subir nuevo archivo',
      boton: 'Subir',
      guardar: (archivo: File, etiquetas: string) =>
        this.archivosService.subir(archivo, this.carpetaActualId() ?? undefined, etiquetas),
    };

    this.dialog
      .open(ArchivoFormComponent, { width: '440px', data: datosForm })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) {
          this.snackBar.open('Archivo subido con éxito', 'Cerrar', { duration: 3000 });
          this.recarga.next();
        }
      });
  }
}