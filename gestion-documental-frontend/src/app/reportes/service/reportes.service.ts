import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { OperacionPorTipo, ArchivoPorTipo } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReportesService extends ApiService {
  operacionesPorTipo() {
    return this.http.get<OperacionPorTipo[]>(`${this.baseUrl}/reportes/actividad/por-tipo`);
  }

  archivosPorTipo() {
    return this.http.get<ArchivoPorTipo[]>(`${this.baseUrl}/reportes/archivos/por-tipo`);
  }
}