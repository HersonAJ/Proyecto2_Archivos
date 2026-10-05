import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { LoginComponent } from './login/login.component';
import { InicioComponent } from './inicio/inicio.component';
import { CarpetaListComponent } from './carpetas/components/carpeta-list/carpeta-list.component';
import { ArchivoListComponent } from './archivos/components/archivo-list/archivo-list.component';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'inicio', component: InicioComponent, canActivate: [authGuard] },
  { path: 'carpetas', component: CarpetaListComponent, canActivate: [authGuard] },
  { path: 'carpetas/:id', component: CarpetaListComponent, canActivate: [authGuard] },

  { path: 'archivos', component: ArchivoListComponent, canActivate: [authGuard] },
  { path: 'archivos/carpeta/:id', component: ArchivoListComponent, canActivate: [authGuard] },


  { path: '', redirectTo: 'inicio', pathMatch: 'full' },
  { path: '**', redirectTo: 'inicio' },
];