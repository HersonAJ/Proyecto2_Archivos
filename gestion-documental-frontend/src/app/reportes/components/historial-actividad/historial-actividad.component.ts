import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { Usuario } from '../../../usuarios/models/usuario.model';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';
import { HistorialActividad, HistorialActividadRespuesta } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
    selector: 'app-historial-actividad',
    imports: [
        DatePipe,
        FormsModule,
        MatButtonModule,
        MatFormFieldModule,
        MatIconModule,
        MatInputModule,
        MatPaginatorModule,
        MatProgressSpinnerModule,
        MatSelectModule,
    ],
    templateUrl: './historial-actividad.component.html',
    styleUrl: './historial-actividad.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HistorialActividadComponent {
    private readonly reportesService = inject(ReportesService);
    private readonly usuariosService = inject(UsuariosService);
    private readonly autenticacion = inject(AuthService);
    private readonly router = inject(Router);

    protected readonly esAdmin = computed(() => this.autenticacion.usuario()?.rol === 'ADMIN');

    // Estado de la pantalla
    protected readonly cargando = signal(true);
    protected readonly error = signal<string | null>(null);
    protected readonly actividades = signal<HistorialActividad[]>([]);
    protected readonly total = signal(0);

    // Filtros
    protected readonly desde = signal<string | null>(null);
    protected readonly hasta = signal<string | null>(null);
    protected readonly usuarioSeleccionado = signal<string | null>(null);

    // Selector de admin
    protected readonly usuarios = signal<Usuario[]>([]);

    // Paginacion
    protected readonly pagina = signal(1);
    protected readonly limite = signal(20);

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

    protected buscar() {
        this.pagina.set(1);
        this.cargar();
    }

    protected limpiar() {
        this.desde.set(null);
        this.hasta.set(null);
        this.pagina.set(1);
        this.cargar();
    }

    protected cambiarUsuario(usuarioId: string) {
        this.usuarioSeleccionado.set(usuarioId);
        this.pagina.set(1);
        this.cargar();
    }

    protected cambiarPagina(evento: PageEvent) {
        this.pagina.set(evento.pageIndex + 1);
        this.limite.set(evento.pageSize);
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
        this.reportesService
            .historialActividad({
                usuarioId,
                desde: this.desde(),
                hasta: this.hasta(),
                pagina: this.pagina(),
                limite: this.limite(),
            })
            .subscribe({
                next: (respuesta: HistorialActividadRespuesta) => {
                    this.actividades.set(respuesta.datos);
                    this.total.set(respuesta.total);
                    this.cargando.set(false);
                },
                error: (e: unknown) => {
                    this.cargando.set(false);
                    this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
                },
            });
    }

    protected formatearDetalles(a: HistorialActividad): string {
        const d = a.detalles as Record<string, unknown>;

        switch (a.accion) {
            case 'SUBIR':
                return `Tamaño: ${this.fmtBytes(d['tamano'])}`;

            case 'DESCARGAR':
                return `Tamaño: ${this.fmtBytes(d['tamano'])}`;

            case 'EDITAR':
                return `Tamaño: ${this.fmtBytes(d['tamanoAnterior'])} → ${this.fmtBytes(d['tamanoNuevo'])}`;

            case 'RENOMBRAR':
                return `${d['anterior']} → ${d['nuevo']}`;

            case 'MOVER':
                return `De: ${this.fmtCarpeta(d['desde'])} · A: ${this.fmtCarpeta(d['hasta'])}`;

            case 'CREAR':
                return d['carpetaPadre']
                    ? `En carpeta: ${d['carpetaPadre']}`
                    : 'En la raíz';

            case 'COMPARTIR':
                return `Con ${d['destinatario']} (${d['nivel']})`;

            case 'MODIFICAR_PERMISO':
                return `Con ${d['destinatario']}: ${d['anterior']} → ${d['nuevo']}`;

            case 'REVOCAR_PERMISO':
                return `Con ${d['destinatario']} (${d['nivel']})`;

            case 'COMENTAR':
                return `"${d['extracto']}…"`;

            case 'ELIMINAR':
                if (d['subcarpetas'] !== undefined && d['archivos'] !== undefined) {
                    return `Subcarpetas: ${d['subcarpetas']} · Archivos: ${d['archivos']}`;
                }
                return d['carpeta'] ? `Desde carpeta: ${d['carpeta']}` : 'Desde la raíz';

            case 'RESTAURAR':
                if (d['subcarpetas'] !== undefined && d['archivos'] !== undefined) {
                    return `Subcarpetas: ${d['subcarpetas']} · Archivos: ${d['archivos']}`;
                }
                return d['enUbicacionOriginal'] ? 'En su ubicación original' : 'En la raíz';

            case 'ELIMINAR_DEFINITIVO':
                if (d['vaciado']) return 'Vaciado de papelera';
                if (d['bytes'] !== undefined) {
                    return `Subcarpetas: ${d['subcarpetas']} · Archivos: ${d['archivos']} · ${this.fmtBytes(d['bytes'])}`;
                }
                return `Tamaño: ${this.fmtBytes(d['tamano'])}`;

            default:
                return JSON.stringify(d);
        }
    }

    private fmtBytes(valor: unknown): string {
        const n = Number(valor);
        if (!Number.isFinite(n)) return '—';
        if (n < 1024) return `${n} B`;
        if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
        return `${(n / (1024 * 1024)).toFixed(1)} MB`;
    }

    private fmtCarpeta(valor: unknown): string {
        if (valor === null || valor === undefined) return 'raíz';
        return String(valor);
    }
}