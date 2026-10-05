import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { COLACION_ES, Carpeta, CarpetaDocument } from '../entities/carpeta.entity';
import { DatosNuevaCarpeta } from '../interfaces/carpetas.interface';

@Injectable()
export class CarpetasRepository {
  constructor(
    @InjectModel(Carpeta.name) private readonly modelo: Model<CarpetaDocument>,
  ) {}

  crear(datos: DatosNuevaCarpeta) {
    return this.modelo.create(datos);
  }

  // Una carpeta que pertenece al usuario y no esta en la papelera
  buscarActiva(id: string, propietario: string) {
    return this.modelo.findOne({ _id: id, propietario, enPapelera: false }).exec();
  }

  // padre = null devuelve las carpetas de la raiz
  listarPorPadre(propietario: string, padre: string | null) {
    return this.modelo
      .find({ propietario, carpetaPadre: padre, enPapelera: false })
      .collation(COLACION_ES)
      .sort({ nombre: 1 }) // 1 = de la A a la Z
      .exec();
  }

  // Solo trae el nombre de las carpetas indicadas (para armar la ruta)
  nombresDe(ids: Types.ObjectId[]) {
    return this.modelo
      .find({ _id: { $in: ids } }) // $in: "el _id esta dentro de esta lista"
      .select('nombre')
      .lean()
      .exec();
  }

  existeHermana(
    propietario: string,
    padre: string | null,
    nombre: string,
    excluirId: string,
  ) {
    return this.modelo
      .exists({
        propietario,
        carpetaPadre: padre,
        nombre,
        enPapelera: false,
        _id: { $ne: excluirId },
      })
      .collation(COLACION_ES)
      .exec();
  }

  renombrar(id: string, nombre: string) {
    return this.modelo
      .findByIdAndUpdate(id, { nombre }, { new: true, runValidators: true })
      .exec();
  }

  // Mueve una carpeta y reescribe los ancestros de todos sus descendientes en un solo comando.
  async moverConDescendientes(
    id: string,
    nuevoPadre: string | null,
    nuevosAncestros: Types.ObjectId[],
  ) {
    const carpeta = new Types.ObjectId(id);
    const nuevoPadreId = nuevoPadre ? new Types.ObjectId(nuevoPadre) : null;
    // Expresion de Mongo: "el documento actual es la carpeta que movemos"
    const esLaCarpeta = { $eq: ['$_id', carpeta] };

    await this.modelo.updateMany(
      // Afecta a la carpeta y a todo documento que la tenga entre sus ancestros
      { $or: [{ _id: carpeta }, { ancestros: carpeta }] },
      [
        {
          $set: {
            ancestros: {
              // $concatArrays une listas: [nuevos ancestros] + [esta carpeta y lo que había debajo]
              $concatArrays: [
                nuevosAncestros,
                {
                  $cond: [
                    esLaCarpeta,
                    [], // la carpeta movida no se incluye a si misma en sus ancestros
                    {
                      $concatArrays: [
                        [carpeta],
                        // $slice: toma los ancestros que habia despues de la carpeta movida
                        {
                          $slice: [
                            '$ancestros',
                            { $add: [{ $indexOfArray: ['$ancestros', carpeta] }, 1] },
                            100000,
                          ],
                        },
                      ],
                    },
                  ],
                },
              ],
            },
            // Solo la carpeta movida cambia de padre; sus descendientes conservan el suyo
            carpetaPadre: { $cond: [esLaCarpeta, nuevoPadreId, '$carpetaPadre'] },
            // $$NOW = fecha y hora actuales del servidor de Mongo
            updatedAt: { $cond: [esLaCarpeta, '$$NOW', '$updatedAt'] },
          },
        },
      ],
      { timestamps: false },
    );
  }
}