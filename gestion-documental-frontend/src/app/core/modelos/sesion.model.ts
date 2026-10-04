export type RolUsuario = 'ADMIN' | 'USUARIO';

export interface UsuarioSesion {
  id: string;
  nombre: string;
  correo: string;
  rol: RolUsuario;
}

export interface RespuestaLogin {
  accessToken: string;
  usuario: UsuarioSesion;
}