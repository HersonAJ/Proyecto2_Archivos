import { UsuarioResumen } from '../../usuarios/models/usuario.model';

export interface Comentario {
  _id: string;
  archivo: string;
  autor: UsuarioResumen;
  texto: string;
  createdAt: string;
}