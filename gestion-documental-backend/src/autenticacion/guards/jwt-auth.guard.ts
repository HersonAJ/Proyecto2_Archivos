import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { UsuariosService } from '../../usuarios/usuarios.service';
import { ES_PUBLICO } from '../decorators/publico.decorator';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import { SolicitudAutenticada } from '../interfaces/solicitud-autenticada.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwtService: JwtService,
    private readonly usuariosService: UsuariosService,
  ) {}

  async canActivate(contexto: ExecutionContext): Promise<boolean> {
    const esPublico = this.reflector.getAllAndOverride<boolean>(ES_PUBLICO, [
      contexto.getHandler(),
      contexto.getClass(),
    ]);
    if (esPublico) return true;

    const solicitud = contexto.switchToHttp().getRequest<SolicitudAutenticada>();
    const token = this.extraerToken(solicitud);
    if (!token) throw new UnauthorizedException('Token requerido');

    let payload: JwtPayload;
    try {
      payload = await this.jwtService.verifyAsync<JwtPayload>(token);
    } catch {
      throw new UnauthorizedException('Token inválido o vencido');
    }

    const usuario = await this.usuariosService.buscarActivoPorId(payload.sub);
    if (!usuario) throw new UnauthorizedException('Usuario no autorizado');

    solicitud.usuario = { id: usuario.id, rol: usuario.rol };
    return true;
  }

  private extraerToken(solicitud: SolicitudAutenticada): string | undefined {
    const [tipo, token] = solicitud.headers.authorization?.split(' ') ?? [];
    return tipo === 'Bearer' ? token : undefined;
  }
}