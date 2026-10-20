import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { CarpetaListComponent } from './carpetas/components/carpeta-list/carpeta-list.component';
import { ShellComponent } from './interfaz/components/sidebar/sidebar.component';
import { authGuard } from './core/guards/auth.guard';
import { PapeleraListComponent } from './papelera/components/papelera-list/papelera-list.component';
import { UsuarioListComponent } from './usuarios/components/usuario-list/usuario-list.component';
import { ComparticionListComponent } from './comparticiones/components/comparticiones-list/comparticiones-list.component';
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


      { path: 'usuarios', component: UsuarioListComponent, canActivate: [rolGuard(['ADMIN'])] },

      { path: '', redirectTo: 'carpetas', pathMatch: 'full' },
    ],
  },

  { path: 'inicio', redirectTo: 'carpetas' },
  { path: '**', redirectTo: 'carpetas' },
];