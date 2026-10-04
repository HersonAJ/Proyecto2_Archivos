import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { RolUsuario } from "../../common/enums/rol-usuario.enum";
import { ROLES_CLAVE } from "../decorators/roles.decorator";
import { SolicitudAutenticada } from "../interfaces/solicitud-autenticada.interface";

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(contexto: ExecutionContext): boolean {
    const rolesPermitidos = this.reflector.getAllAndOverride<RolUsuario[]>(
      ROLES_CLAVE,
      [contexto.getHandler(), contexto.getClass()],
    );
    if (!rolesPermitidos || rolesPermitidos.length === 0) return true;

    const { usuario } = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    if (!usuario || !rolesPermitidos.includes(usuario.rol)) {
      throw new ForbiddenException('No tienes permisos para esta operación');
    }
    return true;
  }
}