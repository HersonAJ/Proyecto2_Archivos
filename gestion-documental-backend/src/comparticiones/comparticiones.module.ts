import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AccesoModule } from '../acceso/acceso.module';
import { ActividadesModule } from '../acciones/actividades.module';
import { Archivo, ArchivoSchema } from '../archivos/entities/archivo.entity';
import { Carpeta, CarpetaSchema } from '../carpetas/entities/carpeta.entity';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { ComparticionesController } from './comparticiones.controller';
import { ComparticionesService } from './comparticiones.service';
import { Comparticion, ComparticionSchema } from './entities/comparticion.entity';
import { ComparticionesRepository } from './repository/comparticiones.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Comparticion.name, schema: ComparticionSchema },
      { name: Carpeta.name, schema: CarpetaSchema },
      { name: Archivo.name, schema: ArchivoSchema },
    ]),
    AccesoModule,
    UsuariosModule,
    ActividadesModule,
  ],
  controllers: [ComparticionesController],
  providers: [ComparticionesService, ComparticionesRepository],
  exports: [ComparticionesRepository],
})
export class ComparticionesModule {}