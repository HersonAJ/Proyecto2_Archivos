import { ChangeDetectionStrategy, Component } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';

interface CardReporte {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
}

@Component({
  selector: 'app-reportes-list',
  imports: [MatIconModule, RouterLink],
  templateUrl: './reportes-list.component.html',
  styleUrl: './reportes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesListComponent {
  protected readonly reportes: CardReporte[] = [
    {
      titulo: 'Operaciones por tipo',
      descripcion: 'Cantidad de operaciones agrupadas por tipo de acción.',
      icono: 'bar_chart',
      ruta: '/reportes/actividad-por-tipo',
    },
    {
      titulo: 'Archivos por tipo',
      descripcion: 'Cantidad de archivos agrupados por tipo (.txt / .md).',
      icono: 'description',
      ruta: '/reportes/archivos-por-tipo',
    },
  ];
}