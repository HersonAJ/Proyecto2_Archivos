import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Actividad, ActividadDocument } from '../../acciones/entities/actividad.entity';
import { Archivo, ArchivoDocument } from '../../archivos/entities/archivo.entity';
import { Carpeta, CarpetaDocument } from '../../carpetas/entities/carpeta.entity';
import { Comparticion, ComparticionDocument } from '../../comparticiones/entities/comparticion.entity';
import { Usuario, UsuarioDocument } from '../../usuarios/entities/usuario.entity';

@Injectable()
export class ReportesRepository {
    constructor(
        @InjectModel(Actividad.name) private readonly actividades: Model<ActividadDocument>,
        @InjectModel(Archivo.name) private readonly archivos: Model<ArchivoDocument>,
        @InjectModel(Carpeta.name) private readonly carpetas: Model<CarpetaDocument>,
        @InjectModel(Comparticion.name) private readonly comparticiones: Model<ComparticionDocument>,
        @InjectModel(Usuario.name) private readonly usuarios: Model<UsuarioDocument>,
    ) { }

    //reporte 10 cantidad de operaciones agruptadas por tipo
    operacionesPorTipo() {
        return this.actividades
            .aggregate<{ _id: string; total: number }>([
                { $group: { _id: '$accion', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ])
            .exec();
    }

    //reporte 1 cantidad de archivos
    archivosPorTipo() {
        return this.archivos
            .aggregate<{ _id: string; total: number }>([
                { $match: { enPapelera: false } },
                { $group: { _id: '$tipo', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
            ])
            .exec();
    }
}