import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Archivo, ArchivoDocument } from '../../archivos/entities/archivo.entity';
import { Carpeta, CarpetaDocument } from '../../carpetas/entities/carpeta.entity';
import { NivelPermiso } from '../../common/enums/nivel-permiso.enum';
import { TipoRecurso } from '../../common/enums/tipo-recurso.enum';
import { Comparticion, ComparticionDocument } from '../entities/comparticion.entity';
import { DatosNuevaComparticion, UsuarioResumen } from '../interfaces/comparticiones.interface';


@Injectable()
export class ComparticionesRepository {

    constructor(
    @InjectModel(Comparticion.name) private readonly modelo: Model<ComparticionDocument>,
    @InjectModel(Carpeta.name) private readonly carpetas: Model<CarpetaDocument>,
    @InjectModel(Archivo.name) private readonly archivos: Model<ArchivoDocument>,
  ) {}

  async crear(datos: DatosNuevaComparticion) {
    const creada = await this.modelo.create(datos);
    return creada.populate<{ destinatario: UsuarioResumen }>('destinatario', 'nombre correo');
  }

  buscarDelPropietario(id: string, propietario: string) {
    return this.modelo
      .findOne({ _id: id, propietario })
      .populate<{ destinatario: UsuarioResumen }>('destinatario', 'nombre correo')
      .exec();
  }

  cambiarNivel(id: string, nivel: NivelPermiso) {
    return this.modelo
      .findByIdAndUpdate(id, { nivel }, { returnDocument: 'after' })
      .populate<{ destinatario: UsuarioResumen }>('destinatario', 'nombre correo')
      .exec();
  }

  async eliminar(id: string) {
    const resultado = await this.modelo.deleteOne({ _id: id }).exec();
    return resultado.deletedCount;
  }

  deRecurso(recurso: string) {
    return this.modelo
      .find({ recurso })
      .sort({ createdAt: 1 }) // 1 = ascendente
      .populate<{ destinatario: UsuarioResumen }>('destinatario', 'nombre correo')
      .exec();
  }

  recibidas(usuarioId: string, limite: number) {
    return this.modelo
      .find({ destinatario: usuarioId })
      .sort({ createdAt: -1 })
      .limit(limite)
      .populate<{ propietario: UsuarioResumen }>('propietario', 'nombre correo')
      .exec();
  }

  otorgadas(usuarioId: string, limite: number) {
    return this.modelo
      .find({ propietario: usuarioId })
      .sort({ createdAt: -1 })
      .limit(limite)
      .populate<{ destinatario: UsuarioResumen }>('destinatario', 'nombre correo')
      .exec();
  }

  async eliminarPorRecursos(recursos: Types.ObjectId[]) {
    if (recursos.length === 0) return 0;
    const resultado = await this.modelo.deleteMany({ recurso: { $in: recursos } }).exec();
    return resultado.deletedCount;
  }

  // Datos de los recursos, para armar las listas

  carpetasActivasPorIds(ids: Types.ObjectId[]) {
    return this.carpetas
      .find({ _id: { $in: ids }, enPapelera: false })
      .select('nombre')
      .lean()
      .exec();
  }

  archivosActivosPorIds(ids: Types.ObjectId[]) {
    return this.archivos
      .find({ _id: { $in: ids }, enPapelera: false })
      .select('nombre tipo tamano')
      .lean()
      .exec();
  }

  async nombreDeRecurso(tipo: TipoRecurso, id: Types.ObjectId): Promise<string> {
    const recurso =
      tipo === TipoRecurso.CARPETA
        ? await this.carpetas.findById(id).select('nombre').lean().exec()
        : await this.archivos.findById(id).select('nombre').lean().exec();
    return recurso?.nombre ?? '(recurso eliminado)';
  }
}