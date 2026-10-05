import { ChangeDetectionStrategy, Component, ViewChild, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, of, switchMap } from 'rxjs';
import { DatePipe } from '@angular/common';

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { Archivo, TipoArchivo, OrdenArchivo, SentidoOrden } from '../../models/archivo.model';
import { ArchivosService } from '../../service/archivos.service';

@Component({
  selector: 'app-archivo-list',
  standalone: true,
  imports: [
    RouterLink, DatePipe,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    MatToolbarModule,
    MatTooltipModule,
  ],
  templateUrl: './archivo-list.component.html',
  styleUrl: './archivo-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivoListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);
  private readonly archivosService = inject(ArchivosService);

  protected readonly archivos = signal<Archivo[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly total = signal(0);
  
  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);
  private readonly recarga = new BehaviorSubject<void>(undefined);

  @ViewChild(MatPaginator) set paginator(p: MatPaginator | undefined) {
    if (p) {
      p.page.pipe(takeUntilDestroyed()).subscribe((evento) => {
        this.pagina.set(evento.pageIndex + 1);
        this.limite.set(evento.pageSize);
        this.recarga.next();
      });
    }
  }

  constructor() {
    combineLatest([this.route.paramMap, this.recarga])
      .pipe(
        switchMap(([params]) => {
          const id = params.get('id');
          this.cargando.set(true);
          this.error.set(null);

          return this.archivosService.listar({
            carpeta: id ?? null,
            pagina: this.pagina(),
            limite: this.limite(),
            orden: OrdenArchivo.CREADO,
            sentido: SentidoOrden.DESC,
          }).pipe(
            catchError((e: unknown) => {
              this.error.set(mensajeDeError(e, 'No se pudieron cargar los archivos'));
              return of(null);
            })
          );
        }),
        takeUntilDestroyed()
      )
      .subscribe((respuesta) => {
        this.cargando.set(false);
        if (respuesta) {
          this.archivos.set(respuesta.datos);
          this.total.set(respuesta.total);
        }
      });
  }

  protected descargarArchivo(archivo: Archivo) {
    this.cargando.set(true);
    this.archivosService.obtenerContenido(archivo.id, true).subscribe({
      next: ({ blob, nombreArchivo }) => {
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombreArchivo || archivo.nombre;
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
      }
    });
  }

  protected obtenerIconoTipo(tipo: TipoArchivo): string {
    return tipo === TipoArchivo.MD ? 'description' : 'text_snippet';
  }

  protected formatearTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  protected subirArchivo() {
    this.snackBar.open('Funcionalidad de subida en desarrollo...', 'Cerrar', { duration: 2000 });
  }
}