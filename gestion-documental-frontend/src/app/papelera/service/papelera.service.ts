import { Injectable } from '@angular/core';
import { Archivo } from '../../archivos/models/archivo.model';
import { Carpeta } from '../../carpetas/models/carpetas.model';
import { ApiService } from '../../core/service/api.service';
import {
  ContenidoPapelera,
  ResultadoEliminacion,
  ResultadoRestauracion,
} from '../models/papelera.model';

@Injectable({ providedIn: 'root' })
export class PapeleraService extends ApiService {
  listar() {
    return this.http.get<ContenidoPapelera>(`${this.baseUrl}/papelera`);
  }

  enviarArchivo(id: string) {
    return this.http.post<Archivo>(`${this.baseUrl}/papelera/archivos/${id}`, {});
  }

  enviarCarpeta(id: string) {
    return this.http.post<Carpeta>(`${this.baseUrl}/papelera/carpetas/${id}`, {});
  }

  restaurarArchivo(id: string) {
    return this.http.post<ResultadoRestauracion>(`${this.baseUrl}/papelera/archivos/${id}/restaurar`, {});
  }

  restaurarCarpeta(id: string) {
    return this.http.post<ResultadoRestauracion>(`${this.baseUrl}/papelera/carpetas/${id}/restaurar`, {});
  }

  eliminarArchivo(id: string) {
    return this.http.delete<ResultadoEliminacion>(`${this.baseUrl}/papelera/archivos/${id}`);
  }

  eliminarCarpeta(id: string) {
    return this.http.delete<ResultadoEliminacion>(`${this.baseUrl}/papelera/carpetas/${id}`);
  }

  vaciar() {
    return this.http.delete<ResultadoEliminacion>(`${this.baseUrl}/papelera`);
  }
}