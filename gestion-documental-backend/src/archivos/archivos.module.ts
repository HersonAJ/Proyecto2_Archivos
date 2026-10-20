import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';
import { MulterModule } from '@nestjs/platform-express';
import { ActividadesModule } from '../acciones/actividades.module';
import { CarpetasModule } from '../carpetas/carpetas.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';
import { Archivo, ArchivoSchema } from './entities/archivo.entity';
import { ArchivosRepository } from './repository/archivos.repository';
import { ContenidosRepository } from './repository/contenidos.repository';
import { AccesoModule } from '../acceso/acceso.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Archivo.name, schema: ArchivoSchema }]),
    MulterModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        limits: {
          fileSize: Number(config.get('ARCHIVO_MAX_MB', 100)) * 1024 * 1024, // MB -> bytes
        },
      }),
    }),
    ActividadesModule,
    UsuariosModule,
    CarpetasModule, AccesoModule,
  ],
  controllers: [ArchivosController],
  providers: [ArchivosService, ArchivosRepository, ContenidosRepository],
  exports: [ArchivosService, ArchivosRepository, ContenidosRepository],
})
export class ArchivosModule {}