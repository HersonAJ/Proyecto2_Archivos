import { DatePipe, Location } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, Router } from '@angular/router';
import { BehaviorSubject, Observable, catchError, combineLatest, from, map, of, switchMap } from 'rxjs';
import { CompartirDialogComponent } from '../../../comparticiones/components/compartir-dialog/compartir-dialog.component';
import { ComentarioListComponent } from '../../../comentarios/components/comentario-list/comentario-list.component';
import { etiquetaNivel, tieneNivel } from '../../../comparticiones/models/comparticion.model';
import { ConCambiosSinGuardar } from '../../../core/guards/cambios-sin-fuardar.guard';
import { guardarBlob } from '../../../core/utils/descarga';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ConfirmarComponent } from '../../../shared/components/confirmar/confirmar.component';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { Archivo, TipoArchivo } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';

const LIMITE_VISTA_BYTES = 1024 * 1024; // 1 MB

@Component({
    selector: 'app-archivo-visor',
    imports: [
        DatePipe,
        TamanoPipe,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        ComentarioListComponent,
    ],
    templateUrl: './archivo-visor.component.html',
    styleUrl: './archivo-visor.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoVisorComponent implements ConCambiosSinGuardar {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);
    private readonly ubicacion = inject(Location);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);
    private readonly archivosService = inject(ArchivosService);
    private readonly usuariosService = inject(UsuariosService);

    protected readonly archivo = signal<Archivo | null>(null);
    protected readonly contenido = signal(''); // texto guardado
    protected readonly borrador = signal(''); // texto que se esta editando
    protected readonly editando = signal(false);
    protected readonly cargando = signal(true);
    protected readonly guardando = signal(false);
    protected readonly error = signal<string | null>(null);
    protected readonly errorGuardado = signal<string | null>(null);
    protected readonly hayConflicto = signal(false);

    protected readonly etiquetaNivel = etiquetaNivel;
    protected readonly nivel = computed(() => this.archivo()?.nivel ?? 'PROPIETARIO');
    protected readonly esPropietario = computed(() => this.nivel() === 'PROPIETARIO');
    protected readonly puedeEditar = computed(() => tieneNivel(this.nivel(), 'EDICION'));
    protected readonly demasiadoGrande = computed(
        () => (this.archivo()?.tamano ?? 0) > LIMITE_VISTA_BYTES,
    );
    protected readonly hayCambios = computed(
        () => this.editando() && this.borrador() !== this.contenido(),
    );

    private readonly recarga = new BehaviorSubject<void>(undefined);

    constructor() {
        combineLatest([this.route.paramMap, this.recarga])
            .pipe(
                switchMap(([params]) => {
                    this.cargando.set(true);
                    this.error.set(null);
                    return this.archivosService.obtener(params.get('id') ?? '').pipe(
                        switchMap((archivo) =>
                            this.cargarTexto(archivo).pipe(map((texto) => ({ archivo, texto }))),
                        ),
                        catchError((e: unknown) => {
                            this.error.set(mensajeDeError(e, 'No se pudo abrir el archivo'));
                            return of(null);
                        }),
                    );
                }),
                takeUntilDestroyed(),
            )
            .subscribe((resultado) => {
                this.cargando.set(false);
                this.editando.set(false);
                this.errorGuardado.set(null);
                this.hayConflicto.set(false);
                this.archivo.set(resultado?.archivo ?? null);
                this.contenido.set(resultado?.texto ?? '');
            });
    }

    tieneCambiosSinGuardar(): boolean {
        return this.hayCambios();
    }

    @HostListener('window:beforeunload', ['$event'])
    avisarAlCerrar(evento: BeforeUnloadEvent) {
        if (this.hayCambios()) evento.preventDefault();
    }

    protected volver() {
        if (window.history.length > 1) this.ubicacion.back();
        else void this.router.navigate(['/carpetas']);
    }

    protected icono(archivo: Archivo): string {
        return archivo.tipo === TipoArchivo.MD ? 'description' : 'text_snippet';
    }

    protected editar() {
        this.borrador.set(this.contenido());
        this.errorGuardado.set(null);
        this.hayConflicto.set(false);
        this.editando.set(true);
    }

    protected cancelar() {
        if (!this.hayCambios()) {
            this.editando.set(false);
            return;
        }
        this.dialog
            .open(ConfirmarComponent, {
                width: '420px',
                data: {
                    titulo: 'Descartar cambios',
                    mensaje: 'Perderás los cambios que no has guardado.',
                    boton: 'Descartar',
                    peligro: true,
                },
            })
            .afterClosed()
            .subscribe((confirmado) => {
                if (confirmado) this.editando.set(false);
            });
    }

    protected alEscribir(evento: Event) {
        this.borrador.set((evento.target as HTMLTextAreaElement).value);
    }

    protected guardar() {
        const archivo = this.archivo();
        if (!archivo) return;

        this.guardando.set(true);
        this.errorGuardado.set(null);
        this.archivosService.editarContenido(archivo._id, this.borrador(), archivo.updatedAt).subscribe({
            next: (actualizado) => {
                this.guardando.set(false);
                this.archivo.set({ ...actualizado, compartidoPor: archivo.compartidoPor });
                this.contenido.set(this.borrador());
                this.editando.set(false);
                this.snackBar.open('Cambios guardados', 'Cerrar', { duration: 3000 });
                this.usuariosService.actualizarAlmacenamiento();
            },
            error: (e: unknown) => {
                this.guardando.set(false);
                this.hayConflicto.set(e instanceof HttpErrorResponse && e.status === 409);
                this.errorGuardado.set(mensajeDeError(e, 'No se pudieron guardar los cambios'));
            },
        });
    }

    protected recargar() {
        this.recarga.next();
    }

    protected descargar() {
        const archivo = this.archivo();
        if (!archivo) return;
        this.archivosService.obtenerContenido(archivo._id, true).subscribe({
            next: ({ blob, nombreArchivo }) => guardarBlob(blob, nombreArchivo ?? archivo.nombre),
            error: (e: unknown) =>
                this.snackBar.open(mensajeDeError(e, 'Error al descargar'), 'Cerrar', { duration: 4000 }),
        });
    }

    protected compartir() {
        const archivo = this.archivo();
        if (!archivo) return;
        this.dialog.open(CompartirDialogComponent, {
            width: '560px',
            data: { tipoRecurso: 'ARCHIVO', recurso: archivo._id, nombre: archivo.nombre },
        });
    }

    private cargarTexto(archivo: Archivo): Observable<string | null> {
        if (archivo.tamano > LIMITE_VISTA_BYTES) return of(null);
        return this.archivosService
            .obtenerContenido(archivo._id, false)
            .pipe(switchMap(({ blob }) => from(blob.text())));
    }
}