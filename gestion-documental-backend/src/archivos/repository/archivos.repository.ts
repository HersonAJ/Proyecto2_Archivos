import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { COLACION_ES } from "../../common/constants/colacion.constante";
import { escaparRegex } from "../../common/utils/regex.util";
import { Archivo, ArchivoDocument } from "../entities/archivo.entity";
import { CambiosArchivo, DatosNuevoArchivo, FiltroArchivos, OrdenamientoArchivos } from "../interfaces/archivos.interface";

@Injectable()
export class ArchivosRepository {
    constructor(
        @InjectModel(Archivo.name) private readonly modelo: Model<ArchivoDocument>,
    ) { }

    crear(datos: DatosNuevoArchivo) {
        return this.modelo.create(datos);
    }

    //un archivo que le pertenece al usuario y no esta en la papelera
    buscarActivo(id: string, propietario: string) {
        return this.modelo.findOne({ _id: id, propietario, enPapelera: false }).exec();
    }

    actualizar(id: string, cambios: CambiosArchivo) {
        return this.modelo
            .findByIdAndUpdate(id, cambios, { returnDocument: 'after', runValidators: true })
            .exec();
    }

    async buscar(
        filtro: FiltroArchivos,
        orden: OrdenamientoArchivos,
        pagina: number,
        limite: number,
    ) {
        const consulta = this.modelo.find({
            propietario: filtro.propietario,
            enPapelera: false,
        });

        if (filtro.carpeta !== undefined) consulta.where('carpeta').equals(filtro.carpeta);
        //busqueda por fragmento del nomnbre: la "i" ignora mayusculas
        if (filtro.q) consulta.where('nombre').regex(new RegExp(escaparRegex(filtro.q), 'i'));
        if (filtro.tipo) consulta.where('tipo').equals(filtro.tipo);

        if (filtro.etiqueta) consulta.where('etiquetas').equals(filtro.etiqueta);
        //gte = mayor o igual y lte = menor o igual
        if (filtro.desde) consulta.where('createdAt').gte(filtro.desde.getTime());
        if (filtro.hasta) consulta.where('createdAt').lte(filtro.hasta.getTime());

        const campo = { nombre: 'nombre', creado: 'createdAt', tamano: 'tamano' }[orden.campo];
        const sentido = orden.sentido === 'asc' ? 1 : -1;

        const [datos, total] = await Promise.all([
            consulta
                .collation(COLACION_ES)
                .sort({ [campo]: sentido, _id: 1 })
                .skip((pagina - 1) * limite)
                .limit(limite)
                .exec(),
            this.modelo.countDocuments(consulta.getFilter()).collation(COLACION_ES),
        ]);

        return { datos, total };
    }

    //metodos para la papelera
    buscarRaizEnPapelera(id: string, propietario: string) {
        return this.modelo
            .findOne({ _id: id, propietario, enPapelera: true, eliminadoPorCascada: false })
            .exec();
    }

    listarRaicesEnPapelera(propietario: string, limite: number) {
        return this.modelo
            .find({ propietario, enPapelera: true, eliminadoPorCascada: false })
            .sort({ fechaEliminacion: -1 })
            .limit(limite)
            .exec();
    }

    enviarAPapelera(id: string, fecha: Date) {
        return this.modelo
            .findOneAndUpdate(
                { _id: id, enPapelera: false },
                { $set: { enPapelera: true, fechaEliminacion: fecha, eliminadoPorCascada: false } },
            )
            .exec();
    }

    async enviarAPapeleraPorCarpetas(carpetas: Types.ObjectId[], fecha: Date) {
        const resultado = await this.modelo
            .updateMany(
                { carpeta: { $in: carpetas }, enPapelera: false },
                { $set: { enPapelera: true, fechaEliminacion: fecha, eliminadoPorCascada: true } },
            )
            .exec();
        return resultado.modifiedCount;
    }

    //hay un archivo activo con ese nombre en la carpeta 
    existeHermano(propietario: string, carpeta: Types.ObjectId | null, nombre: string) {
        return this.modelo
            .exists({ propietario, carpeta, nombre, enPapelera: false })
            .collation(COLACION_ES)
            .exec();
    }

    restaurarRaiz(id: string, datos: { nombre: string; carpeta: Types.ObjectId | null }) {
        return this.modelo
            .findOneAndUpdate(
                { _id: id, enPapelera: true, eliminadoPorCascada: false },
                {
                    $set: {
                        enPapelera: false,
                        fechaEliminacion: null,
                        eliminadoPorCascada: false,
                        nombre: datos.nombre,
                        carpeta: datos.carpeta,
                    },
                },
                { returnDocument: 'after', runValidators: true },
            )
            .exec();
    }

    //restaurar solo los archivos que se fueron en ese mismo lote
    async restaurarPorCarpetas(carpetas: Types.ObjectId[], fecha: Date) {
        const resultado = await this.modelo
            .updateMany(
                { carpeta: { $in: carpetas }, enPapelera: true, eliminadoPorCascada: true, fechaEliminacion: fecha },
                { $set: { enPapelera: false, fechaEliminacion: null, eliminadoPorCascada: false } },
            )
            .exec();
        return resultado.modifiedCount;
    }

    buscarPorCarpetas(carpetas: Types.ObjectId[], propietario: string) {
        return this.modelo
            .find({ propietario, carpeta: { $in: carpetas } })
            .select('contenidoId tamano')
            .lean()
            .exec();
    }

    buscarTodosEnPapelera(propietario: string) {
        return this.modelo
            .find({ propietario, enPapelera: true })
            .select('contenidoId tamano')
            .lean()
            .exec();
    }

    async eliminarUnoEnPapelera(id: string) {
        const resultado = await this.modelo.deleteOne({ _id: id, enPapelera: true }).exec();
        return resultado.deletedCount;
    }

    async eliminarPorIds(ids: Types.ObjectId[]) {
        const resultado = await this.modelo.deleteMany({ _id: { $in: ids } }).exec();
        return resultado.deletedCount;
    }

    buscarActivoPorId(id: string) {
        return this.modelo.findOne({ _id: id, enPapelera: false }).exec();
    }
}