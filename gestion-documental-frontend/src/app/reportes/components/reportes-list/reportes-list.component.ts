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
    {
      titulo: 'Recursos recibidos',
      descripcion: 'Recursos que otros usuarios han compartido contigo, con su nivel de permiso.',
      icono: 'download',
      ruta: '/reportes/comparticiones-recibidas',
      roles: ['ADMIN', 'USUARIO'],
    },
    {
      titulo: 'Historial de actividad',
      descripcion: 'Actividades de un usuario dentro de un rango de fechas.',
      icono: 'history',
      ruta: '/reportes/actividad-historial',
      roles: ['ADMIN', 'USUARIO'],
    },
    {
      titulo: 'Archivos por rango de fechas',
      descripcion: 'Archivos almacenados dentro de un rango de fechas.',
      icono: 'date_range',
      ruta: '/reportes/archivos-por-fechas',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Archivos con más operaciones',
      descripcion: 'Archivos con mayor cantidad de operaciones registradas.',
      icono: 'trending_up',
      ruta: '/reportes/archivos-mas-operaciones',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Archivos nunca compartidos',
      descripcion: 'Archivos activos que no han sido compartidos con ningún usuario.',
      icono: 'lock',
      ruta: '/reportes/archivos-nunca-compartidos',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Carpetas con más archivos',
      descripcion: 'Carpetas activas con mayor cantidad de archivos dentro.',
      icono: 'folder',
      ruta: '/reportes/carpetas-mas-archivos',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Usuarios con más archivos',
      descripcion: 'Usuarios con mayor cantidad de archivos almacenados.',
      icono: 'group',
      ruta: '/reportes/usuarios-mas-archivos',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Usuarios con más compartidos',
      descripcion: 'Usuarios con mayor cantidad de recursos compartidos con otros.',
      icono: 'group_add',
      ruta: '/reportes/usuarios-mas-compartidos',
      roles: ['ADMIN'],
    },
    {
      titulo: 'Archivos con más usuarios',
      descripcion: 'Archivos compartidos con mayor cantidad de usuarios.',
      icono: 'people',
      ruta: '/reportes/archivos-mas-compartidos',
      roles: ['ADMIN'],
    },
  ];

  protected readonly reportesVisibles = computed(() => {
    const rol = this.autenticacion.usuario()?.rol;
    if (!rol) return [];
    return this.reportes.filter((r) => r.roles.includes(rol));
  });
}