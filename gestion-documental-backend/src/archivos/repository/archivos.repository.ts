import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model } from "mongoose";
import { COLACION_ES } from "../../common/constants/colacion.constante";
import { escaparRegex } from "../../common/utils/regex.util";
import { Archivo, ArchivoDocument } from "../entities/archivo.entity";
import { CambiosArchivo, DatosNuevoArchivo, FiltroArchivos, OrdenamientoArchivos } from "../interfaces/archivos.interface";

@Injectable()
export class ArchivosRepository {
    constructor(
        @InjectModel(Archivo.name) private readonly modelo: Model<ArchivoDocument>,
    ) {}

    crear(datos: DatosNuevoArchivo) {
        return this.modelo.create(datos);
    }

    //un archivo que le pertenece al usuario y no esta en la papelera
    buscarActivo(id: string, propietario: string) {
        return this.modelo.findOne({ _id: id, propietario, enPapelera: false}).exec();
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

        const campo = { nombre: 'nombre', creado: 'createdAt', tamano: 'tamano'}[orden.campo];
        const sentido = orden.sentido === 'asc' ? 1 : -1;

        const [datos, total] = await Promise.all([
            consulta
            .collation(COLACION_ES)
            .sort({[campo]: sentido, _id: 1})
            .skip((pagina - 1) * limite)
            .limit(limite)
            .exec(),
            this.modelo.countDocuments(consulta.getFilter()).collation(COLACION_ES),
        ]);

        return { datos, total };
    }
}