import { Injectable } from '@nestjs/common';
import { ReportesRepository } from './repository/reportes.repository';

@Injectable()
export class ReportesService {
  constructor(private readonly reportesRepository: ReportesRepository) { }

  //reporte 10
  async operacionesPorTipo() {
    const filas = await this.reportesRepository.operacionesPorTipo();
    return filas.map((fila) => ({ accion: fila._id, total: fila.total }));
  }

  //reporte 1
  async archivosPorTipo() {
    const filas = await this.reportesRepository.archivosPorTipo();
    return filas.map((fila) => ({ tipo: fila._id, total: fila.total }));
  }
}