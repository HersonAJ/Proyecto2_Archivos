import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Usuario, UsuarioDocument } from '../entities/usuario.entity';

@Injectable()
export class UsuariosRepository {
  constructor(
    @InjectModel(Usuario.name) private readonly modelo: Model<UsuarioDocument>,
  ) {}

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
}