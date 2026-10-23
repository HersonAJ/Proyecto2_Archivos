import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Actividad, ActividadSchema } from '../acciones/entities/actividad.entity';
import { Archivo, ArchivoSchema } from '../archivos/entities/archivo.entity';
import { Carpeta, CarpetaSchema } from '../carpetas/entities/carpeta.entity';
import { Comparticion, ComparticionSchema } from '../comparticiones/entities/comparticion.entity';
import { Usuario, UsuarioSchema } from '../usuarios/entities/usuario.entity';
import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';
import { ReportesRepository } from './repository/reportes.repository';
import { ComparticionesModule } from '../comparticiones/comparticiones.module';

@Module({
    imports: [
        MongooseModule.forFeature([
            { name: Actividad.name, schema: ActividadSchema },
            { name: Archivo.name, schema: ArchivoSchema },
            { name: Carpeta.name, schema: CarpetaSchema },
            { name: Comparticion.name, schema: ComparticionSchema },
            { name: Usuario.name, schema: UsuarioSchema },
        ]), ComparticionesModule,
    ],
    controllers: [ReportesController],
    providers: [ReportesService, ReportesRepository],
})
export class ReportesModule { }