import { Archivo } from '../../archivos/models/archivo.model';
import { Carpeta } from '../../carpetas/models/carpetas.model';

export interface CarpetaEnPapelera extends Carpeta {
  fechaEliminacion: string | null;
}

export interface ContenidoPapelera {
  carpetas: CarpetaEnPapelera[];
  archivos: Archivo[];
}

export interface ResultadoRestauracion {
  elemento: { _id: string; nombre: string };
  enUbicacionOriginal: boolean;
  nombreModificado: boolean;
}

export interface ResultadoEliminacion {
  carpetas: number;
  archivos: number;
  bytes: number;
}