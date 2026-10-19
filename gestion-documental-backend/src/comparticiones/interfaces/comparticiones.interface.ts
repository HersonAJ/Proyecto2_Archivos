import { Types } from 'mongoose';
import { NivelPermiso } from '../../common/enums/nivel-permiso.enum';
import { TipoRecurso } from '../../common/enums/tipo-recurso.enum';

export interface DatosNuevaComparticion {
  tipoRecurso: TipoRecurso;
  recurso: string;
  propietario: string;
  destinatario: string;
  nivel: NivelPermiso;
}

export interface UsuarioResumen {
  _id: Types.ObjectId;
  nombre: string;
  correo: string;
}

export interface RecursoResumen {
  _id: string;
  nombre: string;
  tipo?: string;
  tamano?: number;
}