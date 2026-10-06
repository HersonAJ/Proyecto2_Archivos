import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { Carpeta, CrearCarpeta, DetalleCarpeta } from '../models/carpetas.model';

@Injectable({ providedIn: 'root' })
export class CarpetasService extends ApiService {
  // Sin "padre" devuelve las carpetas de la raiz
  listar(padre?: string) {
    const params: Record<string, string> = padre ? { padre } : {};
    return this.http.get<Carpeta[]>(`${this.baseUrl}/carpetas`, { params });
  }

  obtener(id: string) {
    return this.http.get<DetalleCarpeta>(`${this.baseUrl}/carpetas/${id}`);
  }

  crear(datos: CrearCarpeta) {
    return this.http.post<Carpeta>(`${this.baseUrl}/carpetas`, datos);
  }

  renombrar(id: string, nombre: string) {
    return this.http.patch<Carpeta>(`${this.baseUrl}/carpetas/${id}`, { nombre });
  }

  // carpetaPadre = null mueve la carpeta a la raiz
  mover(id: string, carpetaPadre: string | null) {
    return this.http.patch<Carpeta>(`${this.baseUrl}/carpetas/${id}/mover`, {
      carpetaPadre,
    });
  }
}