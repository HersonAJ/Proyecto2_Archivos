import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { UsuarioResumen } from "../../comparticiones/interfaces/comparticiones.interface";
import { Comentario, ComentarioDocument } from "../entities/comentario.entity";

const LIMITE_LISTA = 500;

@Injectable()
export class ComentariosRepository {

    constructor(
        @InjectModel(Comentario.name) private readonly modelo: Model<ComentarioDocument>,
    ) { }

    async crear(datos: { archivo: string; autor: string; texto: string }) {
        const creado = await this.modelo.create(datos);
        return creado.populate<{ autor: UsuarioResumen }>('autor', 'nombre correo');
    }

    listarPorArchivo(archivo: string) {
        return this.modelo
            .find({ archivo })
            .sort({ createdAt: 1 })
            .limit(LIMITE_LISTA)
            .populate<{ autor: UsuarioResumen }>('autor', 'nombre correo')
            .exec();
    }

    buscarPorId(id: string) {
        return this.modelo.findById(id).exec();
    }

    async eliminar(id: string) {
        const resultado = await this.modelo.deleteOne({ _id: id }).exec();
        return resultado.deletedCount;
    }

    //al eliminar definitivamente archivos, tambien desaparecen sus comentarios
    async eliminarPorArchivos(archivos: Types.ObjectId[]) {
        if (archivos.length === 0) return 0;
        const resultado = await this.modelo.deleteMany({ archivo: { $in: archivos } }).exec();
        return resultado.deletedCount;
    }
}