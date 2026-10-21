import { ChangeDetectionStrategy, Component, inject, input, model, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { forkJoin, of } from 'rxjs';
import { Carpeta } from '../../../carpetas/models/carpetas.model';
import { CarpetasService } from '../../../carpetas/service/carpetas.service';
import { mensajeDeError } from '../../../core/utils/mensaje-error';

@Component({
  selector: 'app-selector-carpeta',
  imports: [MatButtonModule, MatIconModule, MatListModule],
  templateUrl: './selector-carpeta.component.html',
  styleUrl: './selector-carpeta.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SelectorCarpetaComponent {
  private readonly carpetasService = inject(CarpetasService);
  readonly excluirId = input<string | null>(null);
  readonly ubicacion = model<string | null>(null);

  protected readonly nombreUbicacion = signal('Mis documentos');
  private readonly padreUbicacion = signal<string | null>(null);
  protected readonly subcarpetas = signal<Carpeta[]>([]);
  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);

  constructor() {
    this.cargar(null);
  }

  protected entrar(id: string) {
    this.cargar(id);
  }

  protected subir() {
    this.cargar(this.padreUbicacion());
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
        this.nombreUbicacion.set(detalle?.carpeta.nombre ?? 'Mis documentos');
        this.subcarpetas.set(carpetas.filter((c) => c._id !== this.excluirId()));
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudieron cargar las carpetas'));
      },
    });
  }
}