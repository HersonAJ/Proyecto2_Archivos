import { Module } from '@nestjs/common';
import { ActividadesModule } from '../acciones/actividades.module';
import { ArchivosModule } from '../archivos/archivos.module';
import { CarpetasModule } from '../carpetas/carpetas.module';
import { UsuariosModule } from '../usuarios/usuarios.module';
import { PapeleraController } from './papelera.controller';
import { PapeleraService } from './papelera.service';
import { ComparticionesModule } from '../comparticiones/comparticiones.module';

@Module({
  imports: [ArchivosModule, CarpetasModule, UsuariosModule, ActividadesModule, ComparticionesModule],
  controllers: [PapeleraController],
  providers: [PapeleraService],
})
export class PapeleraModule {}