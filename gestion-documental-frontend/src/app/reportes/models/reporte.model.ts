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