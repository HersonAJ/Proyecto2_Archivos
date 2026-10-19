import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from '../entities/usuario.entity';
import { escaparRegex } from '../../common/utils/regex.util';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectModel(Usuario.name) private readonly modelo: Model<UsuarioDocument>,
  ) { }

  crear(datos: Partial<Usuario>) {
    return this.modelo.create(datos);
  }

  listar() {
    return this.modelo.find().sort({ createdAt: -1 }).exec();
  }

  buscarPorId(id: string) {
    return this.modelo.findById(id).exec();
  }

  buscarPorCorreoConPassword(correo: string) {
    return this.modelo.findOne({ correo }).select('+password').exec();
  }

  actualizar(id: string, datos: Partial<Usuario>) {
    return this.modelo
      .findByIdAndUpdate(id, datos, { returnDocument: 'after', runValidators: true })
      .exec();
  }

  ajustarAlmacenamiento(id: string, delta: number) {
    return this.modelo
      .findByIdAndUpdate(id, { $inc: { almacenamientoUsado: delta } })
      .exec();
  }


  buscarActivoPorCorreo(correo: string) {
    return this.modelo.findOne({ correo: correo.trim().toLowerCase(), activo: true }).exec();
  }

  // Directorio para elegir con quién compartir: solo nombre y correo de usuarios activos.
  // $or: coincide si se cumple cualquiera de las condiciones. $ne: "distinto de".
  buscarEnDirectorio(texto: string, excluirId: string, limite: number) {
    const patron = new RegExp(escaparRegex(texto), 'i');
    return this.modelo
      .find({
        activo: true,
        _id: { $ne: excluirId },
        $or: [{ nombre: patron }, { correo: patron }],
      })
      .select('nombre correo')
      .sort({ nombre: 1 })
      .limit(limite)
      .exec();
  }
}