import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service'; 
import { Usuario } from './models/usuario.model';

@Injectable({ providedIn: 'root' })
export class UsuariosService extends ApiService {
  obtenerPerfil() {
    return this.http.get<Usuario>(`${this.baseUrl}/usuarios/perfil`);
  }
}