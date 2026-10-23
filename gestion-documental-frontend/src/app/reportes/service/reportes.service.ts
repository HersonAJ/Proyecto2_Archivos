import { Injectable } from '@angular/core';
import { ApiService } from '../../core/service/api.service';
import { OperacionPorTipo } from '../models/reporte.model';

@Injectable({ providedIn: 'root' })
export class ReportesService extends ApiService {
  operacionesPorTipo() {
    return this.http.get<OperacionPorTipo[]>(`${this.baseUrl}/reportes/actividad/por-tipo`);
  }
}