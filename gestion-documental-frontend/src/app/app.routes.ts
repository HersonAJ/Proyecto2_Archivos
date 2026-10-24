import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CarpetaListComponent } from './carpetas/components/carpeta-list/carpeta-list.component';
import { ShellComponent } from './interfaz/components/sidebar/sidebar.component';
import { authGuard } from './core/guards/auth.guard';
import { PapeleraListComponent } from './papelera/components/papelera-list/papelera-list.component';
import { UsuarioListComponent } from './usuarios/components/usuario-list/usuario-list.component';
import { ComparticionListComponent } from './comparticiones/components/comparticiones-list/comparticiones-list.component';
import { cambiosSinGuardarGuard } from './core/guards/cambios-sin-fuardar.guard';
import { ArchivoVisorComponent } from './archivos/components/archivo-visor/archivo-visor.component';
import { ReportesListComponent } from './reportes/components/reportes-list/reportes-list.component';
import { ActividadPorTipoComponent } from './reportes/components/actividad-por-tipo/actividad-por-tipo.component';
import { ArchivosPorTipoComponent } from './reportes/components/archivos-por-tipo/archivos-por-tipo.component';
import { ComparticionesOtorgadasComponent } from './reportes/components/comparticiones-otorgadas/comparticiones-otorgadas.component';
import { ComparticionesRecibidasComponent } from './reportes/components/comparticiones-recibidas/comparticiones-recibidas.component';
import { HistorialActividadComponent } from './reportes/components/historial-actividad/historial-actividad.component';
import { ArchivosPorFechasComponent } from './reportes/components/archivos-por-fechas/archivos-por-fechas.component';
import { ArchivosMasOperacionesComponent } from './reportes/components/archivos-mas-operaciones/archivos-mas-operaciones.component';
import { ArchivosNuncaCompartidosComponent } from './reportes/components/archivos-nunca-compartidos/archivos-nunca-compartidos.component';
import { CarpetasMasArchivosComponent } from './reportes/components/carpetas-mas-archivos/carpetas-mas-archivos.component';
import { UsuariosMasArchivosComponent } from './reportes/components/usuarios-mas-archivos/usuarios-mas-archivos.component';
import { UsuariosMasCompartidosComponent } from './reportes/components/usuarios-mas-compartidos/usuarios-mas-compartidos.component';
import { ArchivosMasCompartidosComponent } from './reportes/components/archivos-mas-compartidos/archivos-mas-compartidos.component';
import { rolGuard } from './core/guards/rol.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },

  {
    // El guard se aplica una vez al shell y protege todas sus rutas hijas
    path: '',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      { path: 'carpetas', component: CarpetaListComponent },
      { path: 'carpetas/:id', component: CarpetaListComponent },
      { path: 'papelera', component: PapeleraListComponent },
      { path: 'compartidos', component: ComparticionListComponent },
      { path: 'archivos/:id', component: ArchivoVisorComponent, canDeactivate: [cambiosSinGuardarGuard] },


      { path: 'usuarios', component: UsuarioListComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes', component: ReportesListComponent },
      { path: 'reportes/actividad-por-tipo', component: ActividadPorTipoComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/archivos-por-tipo', component: ArchivosPorTipoComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/comparticiones-otorgadas', component: ComparticionesOtorgadasComponent },
      { path: 'reportes/comparticiones-recibidas', component: ComparticionesRecibidasComponent },
      { path: 'reportes/actividad-historial', component: HistorialActividadComponent },
      { path: 'reportes/archivos-por-fechas', component: ArchivosPorFechasComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/archivos-mas-operaciones', component: ArchivosMasOperacionesComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/archivos-nunca-compartidos', component: ArchivosNuncaCompartidosComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/carpetas-mas-archivos', component: CarpetasMasArchivosComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/usuarios-mas-archivos', component: UsuariosMasArchivosComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/usuarios-mas-compartidos', component: UsuariosMasCompartidosComponent, canActivate: [rolGuard(['ADMIN'])] },
      { path: 'reportes/archivos-mas-compartidos', component: ArchivosMasCompartidosComponent, canActivate: [rolGuard(['ADMIN'])] },

      { path: '', redirectTo: 'carpetas', pathMatch: 'full' },
    ],
  },

  { path: 'inicio', redirectTo: 'carpetas' },
  { path: '**', redirectTo: 'carpetas' },
];