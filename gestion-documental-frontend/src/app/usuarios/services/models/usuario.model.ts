export type RolUsuario = 'ADMIN' | 'USUARIO';

export interface Usuario {
  _id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
  activo: boolean;
  almacenamientoUsado: number;
  createdAt: string;
}