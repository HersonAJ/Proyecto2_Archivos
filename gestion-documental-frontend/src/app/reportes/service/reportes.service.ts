import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import {
  OperacionPorTipo, ArchivoPorTipo, ComparticionOtorgada, ComparticionRecibida,
  HistorialActividadRespuesta, ArchivosPorFechasRespuesta, ArchivoConOperaciones
} from '../models/reporte.model';

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

  historialActividad(params: {
    usuarioId?: string;
    desde?: string | null;
    hasta?: string | null;
    pagina: number;
    limite: number;
  }) {
    const query: Record<string, string> = {
      pagina: String(params.pagina),
      limite: String(params.limite),
    };
    if (params.usuarioId) query['usuarioId'] = params.usuarioId;
    if (params.desde) query['desde'] = params.desde;
    if (params.hasta) query['hasta'] = params.hasta;
    return this.http.get<HistorialActividadRespuesta>(
      `${this.baseUrl}/reportes/actividad/historial`,
      { params: query },
    );
  }

  archivosPorFechas(params: {
    desde?: string | null;
    hasta?: string | null;
    pagina: number;
    limite: number;
  }) {
    const query: Record<string, string> = {
      pagina: String(params.pagina),
      limite: String(params.limite),
    };
    if (params.desde) query['desde'] = params.desde;
    if (params.hasta) query['hasta'] = params.hasta;
    return this.http.get<ArchivosPorFechasRespuesta>(
      `${this.baseUrl}/reportes/archivos/por-fechas`,
      { params: query },
    );
  }

  archivosConMasOperaciones(limite: number) {
    return this.http.get<ArchivoConOperaciones[]>(
      `${this.baseUrl}/reportes/archivos/mas-operaciones`,
      { params: { limite: String(limite) } },
    );
  }
}