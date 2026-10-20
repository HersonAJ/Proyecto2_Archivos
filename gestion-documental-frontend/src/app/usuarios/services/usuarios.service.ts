import { Injectable, signal } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { Usuario, ActualizarUsuario, CrearUsuario, UsuarioResumen } from '../models/usuario.model';

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

  listar() {
    return this.http.get<Usuario[]>(`${this.baseUrl}/usuarios`);
  }

  crear(datos: CrearUsuario) {
    return this.http.post<Usuario>(`${this.baseUrl}/usuarios`, datos);
  }

  actualizar(id: string, datos: ActualizarUsuario) {
    return this.http.patch<Usuario>(`${this.baseUrl}/usuarios/${id}`, datos);
  }

  activar(id: string) {
    return this.http.patch<Usuario>(`${this.baseUrl}/usuarios/${id}/activar`, {});
  }

  desactivar(id: string) {
    return this.http.patch<Usuario>(`${this.baseUrl}/usuarios/${id}/desactivar`, {});
  }

  buscarEnDirectorio(texto: string) {
    return this.http.get<UsuarioResumen[]>(`${this.baseUrl}/usuarios/buscar`, {
      params: { q: texto },
    });
  }
}