import { RolUsuario } from "../../common/enums/rol-usuario.enum";

export interface JwtPayload {
    sub: string; //id del usuario
    rol: RolUsuario;
}