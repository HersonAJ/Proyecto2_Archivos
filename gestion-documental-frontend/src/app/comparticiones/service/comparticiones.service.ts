import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { Comparticion, CompartirDatos, ElementoCompartido, NivelPermiso, TipoRecurso } from '../models/comparticion.model';

@Injectable({ providedIn: 'root' })
export class ComparticionesService extends ApiService {
  compartir(datos: CompartirDatos) {
    return this.http.post<Comparticion>(`${this.baseUrl}/comparticiones`, datos);
  }

  // Quien tiene acceso a un recurso
  quienTieneAcceso(tipoRecurso: TipoRecurso, recurso: string) {
    return this.http.get<Comparticion[]>(`${this.baseUrl}/comparticiones/recurso`, {
      params: { tipoRecurso, recurso },
    });
  }

  cambiarNivel(id: string, nivel: NivelPermiso) {
    return this.http.patch<Comparticion>(`${this.baseUrl}/comparticiones/${id}`, { nivel });
  }

  retirar(id: string) {
    return this.http.delete<{ retirada: boolean }>(`${this.baseUrl}/comparticiones/${id}`);
  }

  recibidas() {
    return this.http.get<ElementoCompartido[]>(`${this.baseUrl}/comparticiones/conmigo`);
  }

  otorgadas() {
    return this.http.get<ElementoCompartido[]>(`${this.baseUrl}/comparticiones/por-mi`);
  }
}