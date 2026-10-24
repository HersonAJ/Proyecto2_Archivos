export interface OperacionPorTipo {
    accion: string;
    total: number;
}

export interface ArchivoPorTipo {
    tipo: string;
    total: number;
}

export interface ComparticionOtorgada {
  _id: string;
  tipoRecurso: 'ARCHIVO' | 'CARPETA';
  recurso: {
    _id: string;
    nombre: string;
    tipo?: string;
    tamano?: number;
  };
  destinatario: {
    _id: string;
    nombre: string;
    correo: string;
  };
  nivel: 'LECTURA' | 'COMENTAR' | 'EDICION';
  compartidoEn: string;
}

export interface ComparticionRecibida {
  _id: string;
  tipoRecurso: 'ARCHIVO' | 'CARPETA';
  recurso: {
    _id: string;
    nombre: string;
    tipo?: string;
    tamano?: number;
  };
  propietario: {
    _id: string;
    nombre: string;
    correo: string;
  };
  nivel: 'LECTURA' | 'COMENTAR' | 'EDICION';
  compartidoEn: string;
}

export interface HistorialActividad {
  _id: string;
  usuario: string;
  propietarioRecurso: string;
  accion: string;
  tipoRecurso: 'ARCHIVO' | 'CARPETA';
  recurso: string;
  nombreRecurso: string;
  detalles: Record<string, unknown>;
  fecha: string;
}

export interface HistorialActividadRespuesta {
  datos: HistorialActividad[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ArchivoEnRango {
  _id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  propietario: string;
  createdAt: string;
}

export interface ArchivosPorFechasRespuesta {
  datos: ArchivoEnRango[];
  total: number;
  pagina: number;
  limite: number;
}

export interface ArchivoConOperaciones {
  _id: string;
  nombre: string;
  tipo: string;
  tamano: number;
  propietario: string;
  total: number;
}

export interface CarpetaConArchivos {
  _id: string;
  nombre: string;
  propietario: string;
  total: number;
}