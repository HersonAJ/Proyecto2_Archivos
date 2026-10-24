import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import * as bcrypt from 'bcryptjs';
import { UsuariosService } from "../usuarios/usuarios.service";
import { LoginDto } from "./dto/login.dto";
import { JwtPayload } from "./interfaces/jwt-payload.interface";
import { BadRequestException } from "@nestjs/common";
import { RegistroDto } from "./dto/registro.dto";
import { RolUsuario } from "../common/enums/rol-usuario.enum";

@Injectable()
export class AutenticacionService {
    constructor(
        private readonly usuarioService: UsuariosService,
        private readonly jwtService: JwtService,
    ) {}

    async login(dto: LoginDto) {
        const correo = dto.correo.trim().toLowerCase();
        const usuario = await this.usuarioService.buscarParaLogin(correo);

        const passwordValida =
            usuario !== null && (await bcrypt.compare(dto.password, usuario.password));

        if (!usuario || !usuario.activo || !passwordValida) {
            throw new UnauthorizedException('Credenciales invalidas');
        }

        const payload: JwtPayload = { sub: usuario.id, rol: usuario.rol };

        return {
            accessToken: await this.jwtService.signAsync(payload),
            usuario: {
                id: usuario.id,
                nombre: usuario.nombre,
                correo: usuario.correo,
                rol: usuario.rol,
            },
        };
    }

    async registro(dto: RegistroDto) {
        if (dto.password !== dto.confirmarPassword){
            throw new BadRequestException('Las contraseñas con coinciden');
        }

        const usuario = await this.usuarioService.create({
            nombre: dto.nombre,
            correo: dto.correo,
            password: dto.password,
            rol: RolUsuario.USUARIO,
        });

        return {
            id: usuario.id,
            nombre: usuario.nombre,
            correo: usuario.correo,
            rol: usuario.rol,
        };
    }
}