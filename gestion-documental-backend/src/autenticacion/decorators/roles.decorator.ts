import { SetMetadata } from "@nestjs/common";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";

export const ROLES_CLAVE = 'roles';
export const Roles = (...roles: RolUsuario[]) => 
    SetMetadata(ROLES_CLAVE, roles);