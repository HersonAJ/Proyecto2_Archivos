import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { ArchivoEnRango, ArchivosPorFechasRespuesta } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-archivos-nunca-compartidos',
  imports: [
    DatePipe,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TamanoPipe,
  ],
  templateUrl: './archivos-nunca-compartidos.component.html',
  styleUrl: './archivos-nunca-compartidos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivosNuncaCompartidosComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly archivos = signal<ArchivoEnRango[]>([]);
  protected readonly total = signal(0);

  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);

  constructor() {
    this.cargar();
  }

  protected volver() {
    void this.router.navigate(['/reportes']);
  }

  protected cambiarPagina(evento: PageEvent) {
    this.pagina.set(evento.pageIndex + 1);
    this.limite.set(evento.pageSize);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService
      .archivosNuncaCompartidos({ pagina: this.pagina(), limite: this.limite() })
      .subscribe({
        next: (respuesta: ArchivosPorFechasRespuesta) => {
          this.archivos.set(respuesta.datos);
          this.total.set(respuesta.total);
          this.cargando.set(false);
        },
        error: (e: unknown) => {
          this.cargando.set(false);
          this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
        },
      });
  }
}