import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { forkJoin, of } from 'rxjs';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { Carpeta } from '../../models/carpetas.model';
import { CarpetasService } from '../../service/carpetas.service';

export interface DatosCarpetaMover {
  carpeta: Carpeta;
}

@Component({
  selector: 'app-carpeta-mover',
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './carpeta-mover.component.html',
  styleUrl: './carpeta-mover.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpetaMoverComponent {
  protected readonly datos = inject<DatosCarpetaMover>(MAT_DIALOG_DATA);
  private readonly dialogRef =
    inject<MatDialogRef<CarpetaMoverComponent, boolean>>(MatDialogRef);
  private readonly carpetasService = inject(CarpetasService);

  // Ubicación que se esta viendo en el dialogo (null = raiz)
  protected readonly ubicacion = signal<string | null>(null);
  protected readonly nombreUbicacion = signal('Mis carpetas');
  private readonly padreUbicacion = signal<string | null>(null);
  protected readonly subcarpetas = signal<Carpeta[]>([]);
  protected readonly cargando = signal(true);
  protected readonly enviando = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly puedeMover = computed(
    () => this.ubicacion() !== this.datos.carpeta.carpetaPadre,
  );

  constructor() {
    this.cargar(null);
  }

  protected entrar(id: string) {
    this.cargar(id);
  }

  protected subir() {
    this.cargar(this.padreUbicacion());
  }

  protected mover() {
    this.enviando.set(true);
    this.error.set(null);
    this.carpetasService.mover(this.datos.carpeta._id, this.ubicacion()).subscribe({
      next: () => this.dialogRef.close(true),
      error: (e: unknown) => {
        this.enviando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }

  private cargar(id: string | null) {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      carpetas: this.carpetasService.listar(id ?? undefined),
      detalle: id ? this.carpetasService.obtener(id) : of(null),
    }).subscribe({
      next: ({ carpetas, detalle }) => {
        this.ubicacion.set(id);
        this.padreUbicacion.set(detalle?.carpeta.carpetaPadre ?? null);
        this.nombreUbicacion.set(detalle?.carpeta.nombre ?? 'Mis carpetas');
        // La carpeta que se mueve no puede ser su propio destino
        this.subcarpetas.set(carpetas.filter((c) => c._id !== this.datos.carpeta._id));
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e));
      },
    });
  }
}