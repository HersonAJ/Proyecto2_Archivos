import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Observable } from 'rxjs';
import { Archivo, TipoArchivo } from '../../../archivos/models/archivo.model';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ConfirmarComponent, DatosConfirmar } from '../../../shared/components/confirmar/confirmar.component';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { CarpetaEnPapelera, ResultadoEliminacion } from '../../models/papelera.model';
import { PapeleraService } from '../../service/papelera.service';
import { mensajeRestauracion } from '../../utils/mensaje-restauracion';

interface ElementoPapelera {
    tipo: 'carpeta' | 'archivo';
    id: string;
    nombre: string;
    icono: string;
    esMarkdown: boolean;
    fechaEliminacion: string;
    tamano: number | null; // las carpetas no muestran tamaño
}

@Component({
    selector: 'app-papelera-list',
    imports: [
        DatePipe,
        TamanoPipe,
        MatButtonModule,
        MatIconModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
    ],
    templateUrl: './papelera-list.component.html',
    styleUrl: './papelera-list.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PapeleraListComponent {
    private readonly papeleraService = inject(PapeleraService);
    private readonly usuariosService = inject(UsuariosService);
    private readonly dialog = inject(MatDialog);
    private readonly snackBar = inject(MatSnackBar);

    private readonly carpetas = signal<CarpetaEnPapelera[]>([]);
    private readonly archivos = signal<Archivo[]>([]);
    protected readonly cargando = signal(true);
    protected readonly procesando = signal(false);
    protected readonly error = signal<string | null>(null);

    protected readonly elementos = computed<ElementoPapelera[]>(() => {
        const deCarpetas = this.carpetas().map<ElementoPapelera>((c) => ({
            tipo: 'carpeta',
            id: c._id,
            nombre: c.nombre,
            icono: 'folder',
            esMarkdown: false,
            fechaEliminacion: c.fechaEliminacion ?? '',
            tamano: null,
        }));
        const deArchivos = this.archivos().map<ElementoPapelera>((a) => ({
            tipo: 'archivo',
            id: a._id,
            nombre: a.nombre,
            icono: a.tipo === TipoArchivo.MD ? 'description' : 'text_snippet',
            esMarkdown: a.tipo === TipoArchivo.MD,
            fechaEliminacion: a.fechaEliminacion ?? '',
            tamano: a.tamano,
        }));
        return [...deCarpetas, ...deArchivos].sort(
            (a, b) => new Date(b.fechaEliminacion).getTime() - new Date(a.fechaEliminacion).getTime(),
        );
    });

    constructor() {
        this.cargar();
    }

    protected restaurar(elemento: ElementoPapelera) {
        const peticion =
            elemento.tipo === 'carpeta'
                ? this.papeleraService.restaurarCarpeta(elemento.id)
                : this.papeleraService.restaurarArchivo(elemento.id);

        this.procesando.set(true);
        peticion.subscribe({
            next: (resultado) => {
                this.procesando.set(false);
                this.avisar(mensajeRestauracion(resultado), 6000);
                this.cargar();
            },
            error: (e: unknown) => this.fallar(e, 'No se pudo restaurar'),
        });
    }

    protected eliminarDefinitivamente(elemento: ElementoPapelera) {
        const esCarpeta = elemento.tipo === 'carpeta';
        this.confirmar({
            titulo: 'Eliminar definitivamente',
            mensaje: esCarpeta
                ? `«${elemento.nombre}» y todo su contenido se eliminarán para siempre. Esta acción no se puede deshacer.`
                : `«${elemento.nombre}» se eliminará para siempre. Esta acción no se puede deshacer.`,
            boton: 'Eliminar',
            peligro: true,
        }, () =>
            esCarpeta
                ? this.papeleraService.eliminarCarpeta(elemento.id)
                : this.papeleraService.eliminarArchivo(elemento.id),
            () => `«${elemento.nombre}» eliminado definitivamente`);
    }

    protected vaciar() {
        this.confirmar({
            titulo: 'Vaciar la papelera',
            mensaje: 'Todo lo que hay en la papelera se eliminará para siempre. Esta acción no se puede deshacer.',
            boton: 'Vaciar papelera',
            peligro: true,
        }, () => this.papeleraService.vaciar(),
            (r) => `Papelera vaciada: ${r.archivos} archivo(s) y ${r.carpetas} carpeta(s) eliminados`);
    }

    private confirmar(
        datos: DatosConfirmar,
        ejecutar: () => Observable<ResultadoEliminacion>,
        mensajeExito: (resultado: ResultadoEliminacion) => string,
    ) {
        this.dialog
            .open(ConfirmarComponent, { width: '420px', data: datos })
            .afterClosed()
            .subscribe((confirmado) => {
                if (!confirmado) return;
                this.procesando.set(true);
                ejecutar().subscribe({
                    next: (resultado) => {
                        this.procesando.set(false);
                        this.avisar(mensajeExito(resultado));
                        this.usuariosService.actualizarAlmacenamiento();
                        this.cargar();
                    },
                    error: (e: unknown) => this.fallar(e, 'No se pudo eliminar'),
                });
            });
    }

    private cargar() {
        this.cargando.set(true);
        this.error.set(null);
        this.papeleraService.listar().subscribe({
            next: (contenido) => {
                this.carpetas.set(contenido.carpetas);
                this.archivos.set(contenido.archivos);
                this.cargando.set(false);
            },
            error: (e: unknown) => {
                this.cargando.set(false);
                this.error.set(mensajeDeError(e, 'No se pudo cargar la papelera'));
            },
        });
    }

    private fallar(error: unknown, porDefecto: string) {
        this.procesando.set(false);
        this.avisar(mensajeDeError(error, porDefecto), 5000);
    }

    private avisar(mensaje: string, duracion = 3500) {
        this.snackBar.open(mensaje, 'Cerrar', { duration: duracion });
    }
}