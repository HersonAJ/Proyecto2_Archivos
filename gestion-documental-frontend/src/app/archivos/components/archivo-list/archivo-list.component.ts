import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatSortModule, Sort, SortDirection } from '@angular/material/sort';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, debounceTime, forkJoin, map, of, switchMap, tap } from 'rxjs';
import { CompartirDialogComponent } from '../../../comparticiones/components/compartir-dialog/compartir-dialog.component';
import { etiquetaNivel, tieneNivel } from '../../../comparticiones/models/comparticion.model';
import { guardarBlob } from '../../../core/utils/descarga';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { PapeleraService } from '../../../papelera/service/papelera.service';
import { mensajeRestauracion } from '../../../papelera/utils/mensaje-restauracion';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { Archivo, OrdenArchivo, SentidoOrden, TipoArchivo } from '../../models/archivo.model';
import { ValoresFiltros, aParametros, crearFormularioFiltros, hayFiltrosActivos } from '../../models/filtros-archivo.model';
import { ArchivosService } from '../../service/archivos.service';
import { ArchivoEditarComponent } from '../archivo-editar/archivo-editar.component';
import { ArchivoFiltrosComponent } from '../archivo-filtros/archivo-filtros.component';
import { ArchivoFormComponent, DatosArchivoForm } from '../archivo-form/archivo-form.component';
import { ArchivoMoverComponent } from '../archivo-mover/archivo-mover.component';

@Component({
  selector: 'app-archivo-list',
  imports: [
    DatePipe,
    TamanoPipe,
    RouterLink,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatSortModule,
    MatTooltipModule,
    ArchivoFiltrosComponent,
  ],
  templateUrl: './archivo-list.component.html',
  styleUrl: './archivo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoListComponent {
  private readonly snackBar = inject(MatSnackBar);
  private readonly archivosService = inject(ArchivosService);
  private readonly papeleraService = inject(PapeleraService);
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  readonly carpetaId = input<string | null>(null);
  readonly buscarEnTodo = input(true);

  protected readonly archivos = signal<Archivo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);

  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);
  protected readonly orden = signal<OrdenArchivo>(OrdenArchivo.CREADO);
  protected readonly sentido = signal<SentidoOrden>(SentidoOrden.DESC);

  protected readonly direccion = computed<SortDirection>(() =>
    this.sentido() === SentidoOrden.ASC ? 'asc' : 'desc',
  );

  protected readonly formulario = crearFormularioFiltros();
  protected readonly valores = signal<ValoresFiltros>(this.formulario.getRawValue());
  protected readonly hayFiltros = computed(() => hayFiltrosActivos(this.valores()));
  protected readonly busquedaGlobal = computed(() => this.hayFiltros() && this.buscarEnTodo());
  protected readonly etiquetasDisponibles = signal<string[]>([]);

  protected readonly etiquetaNivel = etiquetaNivel;
  protected readonly hayAjenos = computed(() => this.archivos().some((a) => !this.esMio(a)));
  private readonly recarga = new BehaviorSubject<void>(undefined);

  constructor() {
    this.formulario.valueChanges
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.valores.set(this.formulario.getRawValue()));

    this.formulario.valueChanges.pipe(debounceTime(300), takeUntilDestroyed()).subscribe(() => {
      this.pagina.set(1);
      this.recargar();
    });

    toObservable(this.carpetaId)
      .pipe(
        tap(() => {
          this.pagina.set(1);
          this.formulario.reset(undefined, { emitEvent: false });
          this.valores.set(this.formulario.getRawValue());
        }),
        switchMap((id) => this.recarga.pipe(map(() => id))),
        tap(() => {
          this.cargando.set(true);
          this.error.set(null);
        }),
        switchMap((id) =>
          forkJoin({
            lista: this.archivosService
              .listar({
                carpeta: this.busquedaGlobal() ? null : id,
                pagina: this.pagina(),
                limite: this.limite(),
                orden: this.orden(),
                sentido: this.sentido(),
                ...aParametros(this.formulario.getRawValue()),
              })
              .pipe(
                catchError((e: unknown) => {
                  this.error.set(mensajeDeError(e, 'No se pudieron cargar los archivos'));
                  return of(null);
                }),
              ),
            etiquetas: this.archivosService
              .etiquetas(id && !this.buscarEnTodo() ? id : undefined)
              .pipe(catchError(() => of([] as string[]))),
          }),
        ),
        takeUntilDestroyed(),
      )
      .subscribe(({ lista, etiquetas }) => {
        this.cargando.set(false);
        this.etiquetasDisponibles.set(etiquetas);
        if (lista) {
          this.archivos.set(lista.datos);
          this.total.set(lista.total);
        } else {
          this.archivos.set([]);
          this.total.set(0);
        }
      });
  }

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
          this.usuariosService.actualizarAlmacenamiento();
          this.recargar();
        }
      });
  }

  protected cambiarPagina(evento: PageEvent) {
    this.pagina.set(evento.pageIndex + 1);
    this.limite.set(evento.pageSize);
    this.recargar();
  }

  protected ordenar(evento: Sort) {
    const campo = Object.values(OrdenArchivo).find((o) => o === evento.active);
    if (!campo) return;
    this.orden.set(campo);
    this.sentido.set(evento.direction === 'asc' ? SentidoOrden.ASC : SentidoOrden.DESC);
    this.pagina.set(1);
    this.recargar();
  }

  protected esMio(archivo: Archivo): boolean {
    return tieneNivel(archivo.nivel, 'PROPIETARIO');
  }

  protected puedeEditar(archivo: Archivo): boolean {
    return tieneNivel(archivo.nivel, 'EDICION');
  }

  protected editar(archivo: Archivo) {
    this.dialog
      .open(ArchivoEditarComponent, { width: '480px', data: { archivo } })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) this.terminar('Archivo actualizado');
      });
  }

  protected mover(archivo: Archivo) {
    this.dialog
      .open(ArchivoMoverComponent, { width: '440px', data: { archivo } })
      .afterClosed()
      .subscribe((movido) => {
        if (movido) {
          if (this.archivos().length === 1 && this.pagina() > 1) this.pagina.update((p) => p - 1);
          this.terminar('Archivo movido');
        }
      });
  }

  protected compartir(archivo: Archivo) {
    this.dialog.open(CompartirDialogComponent, {
      width: '560px',
      data: { tipoRecurso: 'ARCHIVO', recurso: archivo._id, nombre: archivo.nombre },
    });
  }

  protected descargarArchivo(archivo: Archivo) {
    this.archivosService.obtenerContenido(archivo._id, true).subscribe({
      next: ({ blob, nombreArchivo }) => {
        guardarBlob(blob, nombreArchivo ?? archivo.nombre);
        this.snackBar.open('Archivo descargado con éxito', 'Cerrar', { duration: 3000 });
      },
      error: (e: unknown) => {
        this.snackBar.open(mensajeDeError(e, 'Error al descargar'), 'Cerrar', { duration: 4000 });
      },
    });
  }

  protected eliminar(archivo: Archivo) {
    this.papeleraService.enviarArchivo(archivo._id).subscribe({
      next: () => {
        if (this.archivos().length === 1 && this.pagina() > 1) this.pagina.update((p) => p - 1);
        this.recargar();
        this.snackBar
          .open(`«${archivo.nombre}» se movió a la papelera`, 'Deshacer', { duration: 6000 })
          .onAction()
          .subscribe(() => this.deshacerEliminacion(archivo._id));
      },
      error: (e: unknown) =>
        this.snackBar.open(mensajeDeError(e, 'No se pudo eliminar el archivo'), 'Cerrar', { duration: 4000 }),
    });
  }

  protected esMarkdown(archivo: Archivo): boolean {
    return archivo.tipo === TipoArchivo.MD;
  }

  protected obtenerIconoTipo(tipo: TipoArchivo): string {
    return tipo === TipoArchivo.MD ? 'description' : 'text_snippet';
  }

  private deshacerEliminacion(id: string) {
    this.papeleraService.restaurarArchivo(id).subscribe({
      next: (resultado) => {
        this.snackBar.open(mensajeRestauracion(resultado), 'Cerrar', { duration: 5000 });
        this.recargar();
      },
      error: (e: unknown) =>
        this.snackBar.open(mensajeDeError(e, 'No se pudo restaurar'), 'Cerrar', { duration: 4000 }),
    });
  }

  private terminar(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
    this.recargar();
  }
}