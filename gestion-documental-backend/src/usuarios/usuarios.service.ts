import { Injectable } from '@nestjs/common';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';

@Injectable()
export class UsuariosService {
  create(createUsuarioDto: CreateUsuarioDto) {
    return {
      mensaje: 'Usuario creado correctamente',
      usuario: createUsuarioDto,
    };
  }

  findAll() {
    return {
      mensaje: 'Usuarios obtenidos correctamente',
      usuarios: [],
    };
  }

  findOne(id: number) {
    return {
      mensaje: 'Usuario obtenido correctamente',
      id,
    };
  }

  update(id: number, updateUsuarioDto: UpdateUsuarioDto) {
    return {
      mensaje: 'Usuario actualizado correctamente',
      id,
      usuario: updateUsuarioDto,
    };
  }

  remove(id: number) {
    return {
      mensaje: 'Usuario eliminado correctamente',
      id,
    };
  }
}
