import { RolUsuario } from './sesion.model';

export interface PerfilUsuario {
  _id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  almacenamientoUsado: number;
  createdAt: string;
}