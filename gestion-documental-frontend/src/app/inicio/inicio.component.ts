import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatToolbarModule } from '@angular/material/toolbar';
import { AuthService } from '../auntenticacion/services/auth.service';
import { Usuario } from '../usuarios/models/usuario.model';
import { UsuariosService } from '../usuarios/services/usuarios.service';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-inicio',
  imports: [MatToolbarModule, MatButtonModule, MatCardModule, RouterLink],
  templateUrl: './inicio.component.html',
  styleUrl: './inicio.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class InicioComponent {
  protected readonly autenticacion = inject(AuthService);
  private readonly usuariosService = inject(UsuariosService);

  protected readonly perfil = signal<Usuario | null>(null);

  constructor() {
    this.usuariosService.obtenerPerfil().subscribe((p) => this.perfil.set(p));
  }
}