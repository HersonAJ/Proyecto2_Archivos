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
      .findByIdAndUpdate(id, { nombre }, { returnDocument: 'after', runValidators: true })
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
      { timestamps: false, updatePipeline: true},
    );
  }

  //metodos para la papelera

  //una carpeta en la papelera es "raiz" de su eliminacion
  buscarRaizEnPapelera(id: string, propietario: string) {
    return this.modelo
    .findOne({_id: id, propietario, enPapelera: true, eliminadaPorCascada: false})
    .exec();
  }

  listarRaicesEnPapelera(propietario: string, limite: number) {
    return this.modelo
    .find({ propietario, enPapelera: true, eliminadaPorCascada: false})
    .sort({ fechaEliminacion: -1 })
    .limit(limite)
    .exec();
  }

  async idDescendentesActivas(id: string) {
    const docs = await this.modelo
    .find({ ancestros: id, enPapelera: false})
    .select('_id')
    .lean() //tipo de objetos ligeros
    .exec();
    return docs.map((d) => d._id);
  }

  //ids de todas las carpetas quecuelgan de la indicada, esten o no n la papelera
  async idsSubarbol(id: string) {
    const docs = await this.modelo.find({ ancestros: id}).select('_id').lean().exec();
    return docs. map((d) => d._id);
  }


  //ids de todas las carpetas del usuario que estan en la papelera
  async idsEnPapelera(propietario: string) {
    const docs = await this.modelo
    .find({ propietario, enPapelera: true})
    .select('_id')
    .lean()
    .exec();
    return docs.map((d) => d._id); 
  }

  //envia todo el contenido de una carpeta a la papelera
  async enviarDescendientesAPapelera(id: string, fecha: Date) {
    const resultado  = await this.modelo
    .updateMany({ ancestros: id, enPapelera: false},
      { $set: { enPapelera: true, fechaEliminacion: fecha, eliminadaPorCascada: true} },
    )
    .exec();
     return resultado.modifiedCount;
  }

  enviarAPapelera(id: string , fecha: Date) {
    return this.modelo
    .findOneAndUpdate(
      {_id: id, enPapelera: false },
      {$set: { enPapelera: true, fechaEliminacion: fecha, eliminadaPorCascada: false}},
    )
    .exec();
  }

  //restaura solo las subcarpetas que se fueron en ese mismo lote
  async restaurarDescendientes(id: string, fecha: Date) {
    const resultado = await this.modelo
    .updateMany(
      { ancestros: id, enPapelera: true, eliminadaPorCascada: true, fechaEliminacion: fecha },
      { $set: { enPapelera: false, fechaEliminacion: null, eliminadaPorCascada: false } },
    )
    .exec();

    return resultado.modifiedCount;
  }

  restaurarRaiz(id: string, datos: { nomnbre: string;  carpetaPadre: Types.ObjectId | null }) {
    return this.modelo
    .findOneAndUpdate(
      {_id: id, enPapelera: true, eliminadaPorCascada: false },
      {
        $set: {
          enPapelera: false,
          fechaEliminacion: null,
          eliminadaPorCascada: false,
          nombre: datos.nomnbre,
          carpetaPadre: datos.carpetaPadre,
        },
      },
    )
    .exec();
  }

  async eliminarPorIds(ids: Types.ObjectId[]) {
    const resultado = await this.modelo.deleteMany({ _id: { $in: ids } }).exec();
    return resultado.deletedCount;
  }
}