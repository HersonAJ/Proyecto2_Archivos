import { createParamDecorator, ExecutionContext } from "@nestjs/common";
import { SolicitudAutenticada, UsuarioAutenticado } from "../interfaces/solicitud-autenticada.interface";

export const UsuarioActual = createParamDecorator(
    (_data: unknown, contexto: ExecutionContext): UsuarioAutenticado | undefined =>
        contexto.switchToHttp().getRequest<SolicitudAutenticada>().usuario,
);