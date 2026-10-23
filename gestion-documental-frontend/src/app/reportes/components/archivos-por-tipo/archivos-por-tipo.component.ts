import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { ArchivoPorTipo } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-archivos-por-tipo',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './archivos-por-tipo.component.html',
  styleUrl: './archivos-por-tipo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivosPorTipoComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly tipos = signal<ArchivoPorTipo[]>([]);

  constructor() {
    this.cargar();
  }

  protected volver() {
    void this.router.navigate(['/reportes']);
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService.archivosPorTipo().subscribe({
      next: (datos) => {
        this.tipos.set(datos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
      },
    });
  }
}