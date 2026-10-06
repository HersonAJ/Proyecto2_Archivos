import { BreakpointObserver } from '@angular/cdk/layout';
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../../auntenticacion/services/auth.service';
import { TamanoPipe } from '../../../shared/pipes/tamano.pipe';
import { UsuariosService } from '../../../usuarios/services/usuarios.service';

@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
    TamanoPipe,
  ],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShellComponent {
  protected readonly autenticacion = inject(AuthService);
  protected readonly usuariosService = inject(UsuariosService);
  private readonly breakpoints = inject(BreakpointObserver);

  protected readonly esMovil = toSignal(
    this.breakpoints.observe('(max-width: 800px)').pipe(map((estado) => estado.matches)),
    { initialValue: false },
  );

  protected readonly inicial = computed(() =>
    (this.autenticacion.usuario()?.nombre ?? '?').charAt(0).toUpperCase(),
  );

  protected readonly etiquetaRol = computed(() =>
    this.autenticacion.usuario()?.rol === 'ADMIN' ? 'Administrador' : 'Usuario',
  );

  constructor() {
    this.usuariosService.actualizarAlmacenamiento();
  }

  protected cerrarSiMovil(menu: MatSidenav) {
    if (this.esMovil()) void menu.close();
  }
}