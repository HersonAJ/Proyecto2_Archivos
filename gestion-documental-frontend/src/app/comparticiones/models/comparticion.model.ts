import { UsuarioResumen } from '../../usuarios/models/usuario.model';

export type NivelPermiso = 'LECTURA' | 'COMENTAR' | 'EDICION';
export type NivelAcceso = NivelPermiso | 'PROPIETARIO';
export type TipoRecurso = 'ARCHIVO' | 'CARPETA';

export const NIVELES: { valor: NivelPermiso; etiqueta: string; descripcion: string }[] = [
  { valor: 'LECTURA', etiqueta: 'Lectura', descripcion: 'Puede ver y descargar.' },
  { valor: 'COMENTAR', etiqueta: 'Comentar', descripcion: 'Puede ver, descargar y comentar.' },
  { valor: 'EDICION', etiqueta: 'Edición', descripcion: 'Puede, además, renombrar y editar los archivos.' },
];

const RANGO: Record<NivelAcceso, number> = {
  LECTURA: 1,
  COMENTAR: 2,
  EDICION: 3,
  PROPIETARIO: 4,
};

export function tieneNivel(nivel: NivelAcceso | undefined, minimo: NivelAcceso): boolean {
  return RANGO[nivel ?? 'PROPIETARIO'] >= RANGO[minimo];
}

export function etiquetaNivel(nivel: NivelAcceso): string {
  return nivel === 'PROPIETARIO'
    ? 'Propietario'
    : (NIVELES.find((n) => n.valor === nivel)?.etiqueta ?? nivel);
}

// Una comparticion con los datos de la persona que recibe
export interface Comparticion {
  _id: string;
  tipoRecurso: TipoRecurso;
  recurso: string;
  propietario: string;
  destinatario: UsuarioResumen;
  nivel: NivelPermiso;
  createdAt: string;
}

export interface ElementoCompartido {
  _id: string;
  nivel: NivelPermiso;
  tipoRecurso: TipoRecurso;
  compartidoEn: string;
  propietario?: UsuarioResumen;
  destinatario?: UsuarioResumen;
  recurso: { _id: string; nombre: string; tipo?: string; tamano?: number };
}

export interface CompartirDatos {
  tipoRecurso: TipoRecurso;
  recurso: string;
  correo: string;
  nivel: NivelPermiso;
}