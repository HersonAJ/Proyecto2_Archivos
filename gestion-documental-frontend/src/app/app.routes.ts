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

      { path: '', redirectTo: 'carpetas', pathMatch: 'full' },
    ],
  },

  { path: 'inicio', redirectTo: 'carpetas' },
  { path: '**', redirectTo: 'carpetas' },
];