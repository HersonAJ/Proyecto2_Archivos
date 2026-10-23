import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { OperacionPorTipo, ArchivoPorTipo, ComparticionOtorgada, ComparticionRecibida } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReportesService extends ApiService {
  operacionesPorTipo() {
    return this.http.get<OperacionPorTipo[]>(`${this.baseUrl}/reportes/actividad/por-tipo`);
  }

  archivosPorTipo() {
    return this.http.get<ArchivoPorTipo[]>(`${this.baseUrl}/reportes/archivos/por-tipo`);
  }

  comparticionesOtorgadas(usuarioId?: string) {
    const params = usuarioId ? `?usuarioId=${usuarioId}` : '';
    return this.http.get<ComparticionOtorgada[]>(`${this.baseUrl}/reportes/comparticiones/otorgadas${params}`);
  }

  comparticionesRecibidas(usuarioId?: string) {
    const params = usuarioId ? `?usuarioId=${usuarioId}` : '';
    return this.http.get<ComparticionRecibida[]>(`${this.baseUrl}/reportes/comparticiones/recibidas${params}`);
  }
}