import { Module } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { UsuariosModule } from "../usuarios/usuarios.module";
import { AuntenticacionController } from "./autenticacion.controller";
import { AutenticacionService } from "./autenticacion.service";

@Module({
    imports: [
        UsuariosModule,
        JwtModule.registerAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                secret: config.getOrThrow<string>('JWT_SECRET'),
                signOptions: {
                    expiresIn: Number(config.getOrThrow('JWT_EXPIRA_SEGUNDOS')),
                },
            }),
        }),
    ],
    controllers: [AuntenticacionController],
    providers: [AutenticacionService],
    exports: [JwtModule],
})
export class AutenticacionModule {}