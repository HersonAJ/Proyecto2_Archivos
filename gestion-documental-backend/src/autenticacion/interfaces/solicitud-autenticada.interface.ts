import type { Request } from 'express';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';

export interface UsuarioAutenticado {
    id: string;
    rol: RolUsuario;
}

export type SolicitudAutenticada = Request & { usuario?: UsuarioAutenticado}