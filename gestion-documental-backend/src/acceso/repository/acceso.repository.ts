import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { Model, Types } from "mongoose";
import { Archivo, ArchivoDocument } from "../../archivos/entities/archivo.entity";
import { Carpeta, CarpetaDocument } from "../../carpetas/entities/carpeta.entity";
import { Comparticion, ComparticionDocument } from "../../comparticiones/entities/comparticion.entity";

@Injectable()
export class AccesoRepository {
    
    constructor(
        @InjectModel(Carpeta.name) private readonly carpetas: Model<CarpetaDocument>,
        @InjectModel(Archivo.name) private readonly archivos: Model<ArchivoDocument>,
        @InjectModel(Comparticion.name) private readonly comparticiones: Model<ComparticionDocument>
    ) {}

    carpetaActiva(id: string) {
        return this.carpetas
        .findOne({ _id: id, enPapelera: false})
        .select('nombre propietario ancestros')
        .lean()
        .exec();
    }

    archivoActivo(id: string) {
        return this.archivos
        .findOne({ _id: id, enPapelera: false })
        .lean()
        .exec();
    }

    //permisos que el usuario tiene concedidos sobre alguno de los recursos
    permisos( usuarioId: string, recursos: Types.ObjectId[]) {
        return this.comparticiones
        .find({ destinatario: usuarioId, recurso: { $in: recursos } })
        .lean()
        .exec();
    }
}