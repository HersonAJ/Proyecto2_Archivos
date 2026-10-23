import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Actividad, ActividadDocument } from '../../acciones/entities/actividad.entity';
import { Archivo, ArchivoDocument } from '../../archivos/entities/archivo.entity';
import { Carpeta, CarpetaDocument } from '../../carpetas/entities/carpeta.entity';
import { Comparticion, ComparticionDocument } from '../../comparticiones/entities/comparticion.entity';
import { Usuario, UsuarioDocument } from '../../usuarios/entities/usuario.entity';
import { Types } from 'mongoose';

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

    //reporte 7 recursos que un usuario ha compartido
    comparticionesOtorgadas(usuarioId: string, limite: number) {
        return this.comparticiones
            .aggregate<{
                _id: Types.ObjectId;
                tipoRecurso: string;
                recurso: Types.ObjectId;
                nivel: string;
                compartidoEn: Date,
                destinatario: { _id: Types.ObjectId; nombre: string; correo: string };
            }>([
                { $match: { propietario: new Types.ObjectId(usuarioId) } },
                { $sort: { createdAt: -1 } },
                { $limit: limite },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'destinatario',
                        foreignField: '_id',
                        as: 'destinatario',
                        pipeline: [{ $project: { _id: 1, nombre: 1, correo: 1 } }],
                    },
                },
                { $unwind: '$destinatario' },
                {
                    $project: {
                        _id: 1,
                        tipoRecurso: 1,
                        recurso: 1,
                        nivel: 1,
                        compartidoEn: '$createdAt',
                        destinatario: 1,
                    },
                },
            ])
            .exec();
    }

    // Reporte 8 recursos que un usuario ha recibido
    comparticionesRecibidas(usuarioId: string, limite: number) {
        return this.comparticiones
            .aggregate<{
                _id: Types.ObjectId;
                tipoRecurso: string;
                recurso: Types.ObjectId;
                nivel: string;
                compartidoEn: Date;
                propietario: { _id: Types.ObjectId; nombre: string; correo: string };
            }>([
                { $match: { destinatario: new Types.ObjectId(usuarioId) } },
                { $sort: { createdAt: -1 } },
                { $limit: limite },
                {
                    $lookup: {
                        from: 'usuarios',
                        localField: 'propietario',
                        foreignField: '_id',
                        as: 'propietario',
                        pipeline: [{ $project: { _id: 1, nombre: 1, correo: 1 } }],
                    },
                },
                { $unwind: '$propietario' },
                {
                    $project: {
                        _id: 1,
                        tipoRecurso: 1,
                        recurso: 1,
                        nivel: 1,
                        compartidoEn: '$createdAt',
                        propietario: 1,
                    },
                },
            ])
            .exec();
    }
}