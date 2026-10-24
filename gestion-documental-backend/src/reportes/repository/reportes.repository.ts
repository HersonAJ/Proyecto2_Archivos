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

    archivosPorFecha(desde: Date | undefined, hasta: Date | undefined, pagina: number, limite: number) {
        const match: Record<string, unknown> = { enPapelera: false };
        if (desde || hasta) {
            const rango: Record<string, Date> = {};
            if (desde) rango['$gte'] = desde;
            if (hasta) rango['$lte'] = hasta;
            match['createdAt'] = rango;
        }

        return Promise.all([
            this.archivos
                .find(match)
                .sort({ createdAt: -1 })
                .skip((pagina - 1) * limite)
                .limit(limite)
                .select('nombre tipo tamano propietario createdAt')
                .lean()
                .exec(),
            this.archivos.countDocuments(match).exec(),
        ]).then(([datos, total]) => ({ datos, total }));
    }

    archivosConMasOperaciones(limite: number) {
        return this.actividades
            .aggregate<{
                _id: Types.ObjectId;
                total: number;
                archivo: { _id: Types.ObjectId; nombre: string; tipo: string; tamano: number; propietario: Types.ObjectId };
            }>([
                { $match: { tipoRecurso: 'ARCHIVO' } },
                { $group: { _id: '$recurso', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: limite },
                {
                    $lookup: {
                        from: 'archivos',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'archivo',
                        pipeline: [
                            { $match: { enPapelera: false } },
                            { $project: { _id: 1, nombre: 1, tipo: 1, tamano: 1, propietario: 1 } },
                        ],
                    },
                },
                { $unwind: '$archivo' },
            ])
            .exec();
    }

    archivosNuncaCompartidos(pagina: number, limite: number) {
        return this.archivos
            .aggregate<{
                datos: {
                    _id: Types.ObjectId;
                    nombre: string;
                    tipo: string;
                    tamano: number;
                    propietario: Types.ObjectId;
                    createdAt: Date;
                }[];
                total: { n: number }[];
            }>([
                { $match: { enPapelera: false } },
                {
                    $lookup: {
                        from: 'comparticiones',
                        let: { archivoId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ['$recurso', '$$archivoId'] },
                                            { $eq: ['$tipoRecurso', 'ARCHIVO'] },
                                        ],
                                    },
                                },
                            },
                            { $limit: 1 },
                            { $project: { _id: 1 } },
                        ],
                        as: 'comparticiones',
                    },
                },
                { $match: { comparticiones: { $size: 0 } } },
                { $project: { comparticiones: 0 } },
                { $sort: { createdAt: -1 } },
                {
                    $facet: {
                        datos: [
                            { $skip: (pagina - 1) * limite },
                            { $limit: limite },
                        ],
                        total: [{ $count: 'n' }],
                    },
                },
            ])
            .exec()
            .then(([resultado]) => ({
                datos: resultado?.datos ?? [],
                total: resultado?.total[0]?.n ?? 0,
            }));
    }

    carpetasConMasArchivos(limite: number) {
        return this.archivos
            .aggregate<{
                _id: Types.ObjectId;
                total: number;
                carpeta: { _id: Types.ObjectId; nombre: string; propietario: Types.ObjectId };
            }>([
                { $match: { enPapelera: false, carpeta: { $ne: null } } },
                { $group: { _id: '$carpeta', total: { $sum: 1 } } },
                { $sort: { total: -1 } },
                { $limit: limite },
                {
                    $lookup: {
                        from: 'carpetas',
                        localField: '_id',
                        foreignField: '_id',
                        as: 'carpeta',
                        pipeline: [
                            { $match: { enPapelera: false } },
                            { $project: { _id: 1, nombre: 1, propietario: 1 } },
                        ],
                    },
                },
                { $unwind: '$carpeta' },
            ])
            .exec();
    }
}