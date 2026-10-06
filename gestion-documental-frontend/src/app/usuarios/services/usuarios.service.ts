import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../core/service/api.service'; 
import { Usuario } from './models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService extends ApiService {

  readonly almacenamientoUsado = signal<number | null>(null);


  obtenerPerfil() {
    return this.http.get<Usuario>(`${this.baseUrl}/usuarios/perfil`);
  }

  actualizarAlmacenamiento() {
    this.obtenerPerfil().subscribe({
      next: (perfil) => this.almacenamientoUsado.set(perfil.almacenamientoUsado),
      error: () => undefined,
    });
  }
}