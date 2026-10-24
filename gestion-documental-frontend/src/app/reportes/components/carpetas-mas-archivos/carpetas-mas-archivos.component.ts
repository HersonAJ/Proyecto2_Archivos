import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { Router } from '@angular/router';
import { mensajeDeError } from '../../../core/utils/mensaje-error';
import { CarpetaConArchivos } from '../../models/reporte.model';
import { ReportesService } from '../../service/reportes.service';

@Component({
  selector: 'app-carpetas-mas-archivos',
  imports: [
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSelectModule,
  ],
  templateUrl: './carpetas-mas-archivos.component.html',
  styleUrl: './carpetas-mas-archivos.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpetasMasArchivosComponent {
  private readonly reportesService = inject(ReportesService);
  private readonly router = inject(Router);

  protected readonly cargando = signal(true);
  protected readonly error = signal<string | null>(null);
  protected readonly carpetas = signal<CarpetaConArchivos[]>([]);

  protected readonly limite = signal(10);
  protected readonly opcionesLimite = [5, 10, 20, 50];

  constructor() {
    this.cargar();
  }

  protected volver() {
    void this.router.navigate(['/reportes']);
  }

  protected cambiarLimite(limite: number) {
    this.limite.set(limite);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.reportesService.carpetasConMasArchivos(this.limite()).subscribe({
      next: (datos) => {
        this.carpetas.set(datos);
        this.cargando.set(false);
      },
      error: (e: unknown) => {
        this.cargando.set(false);
        this.error.set(mensajeDeError(e, 'No se pudo cargar el reporte'));
      },
    });
  }
}