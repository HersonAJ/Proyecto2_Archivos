import { ChangeDetectionStrategy, Component, inject, signal, viewChild } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatToolbarModule } from '@angular/material/toolbar';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { BehaviorSubject, catchError, combineLatest, forkJoin, of, switchMap } from 'rxjs';
import { ArchivoListComponent } from '../../../archivos/components/archivo-list/archivo-list.component';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { Carpeta, RutaCarpeta } from '../../models/carpetas.model';
import { CarpetasService } from '../../service/carpetas.service';
import { CarpetaFormComponent, DatosCarpetaForm } from '../carpeta-form/carpeta-form.component';
import { CarpetaMoverComponent } from '../carpeta-mover/carpeta-mover.component';
import { PapeleraService } from '../../../papelera/service/papelera.service';
import { mensajeRestauracion } from '../../../papelera/utils/mensaje-restauracion';

@Component({
  selector: 'app-carpeta-list',
  imports: [
    RouterLink,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatListModule,
    MatMenuModule,
    ArchivoListComponent,
  ],
  templateUrl: './carpeta-list.component.html',
  styleUrl: './carpeta-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpetaListComponent {
  private readonly route = inject(ActivatedRoute);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly carpetasService = inject(CarpetasService);
  private readonly papeleraService = inject(PapeleraService);
  private readonly listaArchivos = viewChild(ArchivoListComponent);
  protected readonly idActual = signal<string | null>(null);

  protected readonly carpetas = signal<Carpeta[]>([]);
  protected readonly ruta = signal<RutaCarpeta[]>([]);
  protected readonly actual = signal<Carpeta | null>(null); // null = estamos en la raíz
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  private readonly recarga = new BehaviorSubject<void>(undefined);

  constructor() {
    combineLatest([this.route.paramMap, this.recarga])
      .pipe(
        switchMap(([params]) => {
          const id = params.get('id');
          this.idActual.set(id);
          this.cargando.set(true);
          this.error.set(null);
          return forkJoin({
            carpetas: this.carpetasService.listar(id ?? undefined),
            detalle: id ? this.carpetasService.obtener(id) : of(null),
          }).pipe(
            catchError((e: unknown) => {
              this.error.set(mensajeDeError(e, 'No se pudieron cargar las carpetas'));
              return of(null);
            }),
          );
        }),
        takeUntilDestroyed(),
      )
      .subscribe((resultado) => {
        this.cargando.set(false);
        this.carpetas.set(resultado?.carpetas ?? []);
        this.ruta.set(resultado?.detalle?.ruta ?? []);
        this.actual.set(resultado?.detalle?.carpeta ?? null);
      });
  }

  protected subirArchivo() {
    this.listaArchivos()?.subirArchivo();
  }

  protected nuevaCarpeta() {
    const padre = this.actual()?._id;
    this.abrirFormulario(
      {
        titulo: 'Nueva carpeta',
        boton: 'Crear',
        nombre: '',
        guardar: (nombre) => this.carpetasService.crear({ nombre, carpetaPadre: padre }),
      },
      'Carpeta creada',
    );
  }

  protected renombrar(carpeta: Carpeta) {
    this.abrirFormulario(
      {
        titulo: 'Renombrar carpeta',
        boton: 'Guardar',
        nombre: carpeta.nombre,
        guardar: (nombre) => this.carpetasService.renombrar(carpeta._id, nombre),
      },
      'Carpeta renombrada',
    );
  }

  protected mover(carpeta: Carpeta) {
    this.dialog
      .open(CarpetaMoverComponent, { width: '440px', data: { carpeta } })
      .afterClosed()
      .subscribe((movida) => {
        if (movida) this.terminar('Carpeta movida');
      });
  }

  protected eliminar(carpeta: Carpeta) {
    this.papeleraService.enviarCarpeta(carpeta._id).subscribe({
      next: () => {
        this.recarga.next();
        this.snackBar
          .open(`«${carpeta.nombre}» se movió a la papelera`, 'Deshacer', { duration: 6000 })
          .onAction()
          .subscribe(() => this.deshacerEliminacion(carpeta._id));
      },
      error: (e: unknown) =>
        this.snackBar.open(mensajeDeError(e, 'No se pudo eliminar la carpeta'), 'Cerrar', { duration: 4000 }),
    });
  }

  private deshacerEliminacion(id: string) {
    this.papeleraService.restaurarCarpeta(id).subscribe({
      next: (resultado) => {
        this.snackBar.open(mensajeRestauracion(resultado), 'Cerrar', { duration: 5000 });
        this.recarga.next();
      },
      error: (e: unknown) =>
        this.snackBar.open(mensajeDeError(e, 'No se pudo restaurar'), 'Cerrar', { duration: 4000 }),
    });
  }

  private abrirFormulario(datos: DatosCarpetaForm, mensaje: string) {
    this.dialog
      .open(CarpetaFormComponent, { width: '400px', data: datos })
      .afterClosed()
      .subscribe((guardado) => {
        if (guardado) this.terminar(mensaje);
      });
  }

  private terminar(mensaje: string) {
    this.snackBar.open(mensaje, 'Cerrar', { duration: 3000 });
    this.recarga.next();
  }
}