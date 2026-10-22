import { NivelAcceso } from "../../comparticiones/models/comparticion.model";
import { UsuarioResumen } from "../../usuarios/models/usuario.model";

export enum TipoArchivo {
  TXT = 'txt',
  MD = 'md'
}

export enum OrdenArchivo {
  NOMBRE = 'nombre',
  CREADO = 'creado',
  TAMANO = 'tamano'
}

export enum SentidoOrden {
  ASC = 'asc',
  DESC = 'desc'
}

export interface Archivo {
  _id: string;
  nombre: string;
  tipo: TipoArchivo;
  tamano: number;
  propietario: string;
  carpeta: string | null;
  contenidoId: string;
  etiquetas: string[];
  enPapelera: boolean;
  fechaEliminacion: string | null;
  eliminadoPorCascada: boolean;
  createdAt: string;
  updatedAt: string;
  nivel?: NivelAcceso;
  compartidoPor?: UsuarioResumen | null;
  ubicacion?: string | null;
}

export interface ListarArchivosResponse {
  datos: Archivo[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ListarArchivosParams {
  carpeta?: string | null;
  q?: string;
  tipo?: TipoArchivo;
  etiqueta?: string;
  desde?: string;
  hasta?: string;
  orden?: OrdenArchivo;
  sentido?: SentidoOrden;
  pagina?: number;
  limite?: number;
}

export interface ActualizarArchivoDto {
  nombre?: string;
  etiquetas?: string[];
}

export interface MoverArchivoDto {
  carpeta: string | null;
}

export interface SubirArchivoParams {
  carpeta?: string;
  etiquetas?: string;
}