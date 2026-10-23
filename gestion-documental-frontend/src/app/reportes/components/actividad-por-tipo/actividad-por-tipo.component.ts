import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { OperacionPorTipo } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-actividad-por-tipo',
  imports: [MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './actividad-por-tipo.component.html',
  styleUrl: './actividad-por-tipo.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActividadPorTipoComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly operaciones = signal<OperacionPorTipo[]>([]);

  constructor() {
    this.cargar();
  }

  protected volver() {
    void this.router.navigate(['/reportes']);
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService.operacionesPorTipo().subscribe({
      next: (datos) => {
        this.operaciones.set(datos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
      },
    });
  }
}