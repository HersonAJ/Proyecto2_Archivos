import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsuariosModule } from './usuarios/usuarios.module';
import { AutenticacionModule } from './autenticacion/autenticacion.module';
import { ActividadesModule } from './acciones/actividades.module';
import { CarpetasModule } from './carpetas/carpetas.module';
import { ArchivosModule } from './archivos/archivos.module';
import { PapeleraModule } from './papelera/papelera.module';
import { ComparticionesModule } from './comparticiones/comparticiones.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.getOrThrow<string>('MONGODB_URI'),
      }),
    }),
    UsuariosModule, AutenticacionModule, ActividadesModule, CarpetasModule, ArchivosModule, PapeleraModule, ComparticionesModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}