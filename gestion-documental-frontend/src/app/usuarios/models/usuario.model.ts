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

export interface CrearUsuario {
  nombre: string;
  correo: string;
  password: string;
  rol?: RolUsuario;
}

export type ActualizarUsuario = Partial<CrearUsuario>;

export interface  UsuarioResumen {
  _id: string;
  nombre: string;
  correo: string;
}