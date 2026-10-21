import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { Comentario } from '../models/comentario.model';

@Injectable({ providedIn: 'root' })
export class ComentariosService extends ApiService {
  listar(archivoId: string) {
    return this.http.get<Comentario[]>(`${this.baseUrl}/archivos/${archivoId}/comentarios`);
  }

  crear(archivoId: string, texto: string) {
    return this.http.post<Comentario>(`${this.baseUrl}/archivos/${archivoId}/comentarios`, { texto });
  }

  eliminar(id: string) {
    return this.http.delete<{ eliminado: boolean }>(`${this.baseUrl}/comentarios/${id}`);
  }
}