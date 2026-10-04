import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import * as bcrypt from 'bcryptjs';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { UsuariosRepository } from './repository/usuarios.repository';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';

@Injectable()
export class UsuariosService {
  constructor(private readonly usuariosRepository: UsuariosRepository) { }

  async create(dto: CreateUsuarioDto) {
    const password = await bcrypt.hash(dto.password, 10);
    try {
      return await this.usuariosRepository.crear({ ...dto, password });
    } catch (error) {
      this.lanzarSiCorreoRepetido(error);
      throw error;
    }
  }

  findAll() {
    return this.usuariosRepository.listar();
  }

  async findOne(id: string) {
    const usuario = await this.usuariosRepository.buscarPorId(id);
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  async update(id: string, dto: UpdateUsuarioDto) {
    const cambios = { ...dto };
    if (dto.password) {
      cambios.password = await bcrypt.hash(dto.password, 10);
    }
    try {
      const usuario = await this.usuariosRepository.actualizar(id, cambios);
      if (!usuario) throw new NotFoundException('Usuario no encontrado');
      return usuario;
    } catch (error) {
      this.lanzarSiCorreoRepetido(error);
      throw error;
    }
  }

  desactivar(id: string) {
    return this.cambiarEstado(id, false);
  }

  activar(id: string) {
    return this.cambiarEstado(id, true);
  }

  private async cambiarEstado(id: string, activo: boolean) {
    const usuario = await this.usuariosRepository.actualizar(id, { activo });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return usuario;
  }

  private lanzarSiCorreoRepetido(error: unknown) {
    if (esClaveDuplicada(error)) {
      throw new ConflictException('Ya existe un usuario con ese correo');
    }
  }

  buscarParaLogin(correo: string) {
    return this.usuariosRepository.buscarPorCorreoConPassword(correo);
  }

  async buscarActivoPorId(id: string) {
    const usuario = await this.usuariosRepository.buscarPorId(id);
    return usuario?.activo ? usuario : null;
  }
}