import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { ArchivoEnRango, ArchivosPorFechasRespuesta } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-archivos-por-fechas',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatPaginatorModule,
    MatProgressSpinnerModule,
    TamanoPipe,
  ],
  templateUrl: './archivos-por-fechas.component.html',
  styleUrl: './archivos-por-fechas.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ArchivosPorFechasComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly archivos = signal<ArchivoEnRango[]>([]);
  protected readonly total = signal(0);

  protected readonly desde = signal<string | null>(null);
  protected readonly hasta = signal<string | null>(null);

  protected readonly pagina = signal(1);
  protected readonly limite = signal(20);

  constructor() {
    this.cargar();
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

  protected cambiarPagina(evento: PageEvent) {
    this.pagina.set(evento.pageIndex + 1);
    this.limite.set(evento.pageSize);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService
      .archivosPorFechas({
        desde: this.desde(),
        hasta: this.hasta(),
        pagina: this.pagina(),
        limite: this.limite(),
      })
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