/*import { ChangeDetectionStrategy, Component } from '@angular/core';
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
    {
      titulo: 'Recursos compartidos',
      descripcion: 'Recursos que has compartido con otros usuarios, con su nivel de permiso.',
      icono: 'share',
      ruta: '/reportes/comparticiones-otorgadas',
    },
  ];
}*/

import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { RolUsuario } from '../../../usuarios/models/usuario.model';

interface CardReporte {
  titulo: string;
  descripcion: string;
  icono: string;
  ruta: string;
  roles: RolUsuario[];
}

@Component({
  selector: 'app-reportes-list',
  imports: [MatIconModule, RouterLink],
  templateUrl: './reportes-list.component.html',
  styleUrl: './reportes-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ReportesListComponent {
  private readonly autenticacion = inject(AuthService);

  private readonly reportes: CardReporte[] = [
    {
      titulo: 'Operaciones por tipo',
      descripcion: 'Cantidad de operaciones agrupadas por tipo de acción.',
      icono: 'bar_chart',
      ruta: '/reportes/actividad-por-tipo',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Archivos por tipo',
      descripcion: 'Cantidad de archivos agrupados por tipo (.txt / .md).',
      icono: 'description',
      ruta: '/reportes/archivos-por-tipo',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Recursos compartidos',
      descripcion: 'Recursos que has compartido con otros usuarios, con su nivel de permiso.',
      icono: 'share',
      ruta: '/reportes/comparticiones-otorgadas',
      roles: ['ADMIN', 'USUARIO'],
    },
  ];

  protected readonly reportesVisibles = computed(() => {
    const rol = this.autenticacion.usuario()?.rol;
    if (!rol) return [];
    return this.reportes.filter((r) => r.roles.includes(rol));
  });
}