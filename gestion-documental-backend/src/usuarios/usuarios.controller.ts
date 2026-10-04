import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ActualizarPerfilDto } from './dto/actualizar-perfil.dto';
import { ParseObjectIdPipe1 } from '../common/pipes/parse-object-id.pipe';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';

@Controller('usuarios')
@Roles(RolUsuario.ADMIN)
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}


  @Get('perfil')
  @Roles(RolUsuario.ADMIN, RolUsuario.USUARIO)
  verPerfil(@UsuarioActual() actual: UsuarioAutenticado) {
    return this.usuariosService.findOne(actual.id);
  }

  @Patch('perfil')
  @Roles(RolUsuario.ADMIN, RolUsuario.USUARIO)
  actualizarPerfil(
    @UsuarioActual() actual: UsuarioAutenticado,
    @Body() dto: ActualizarPerfilDto,
  ) {
    return this.usuariosService.update(actual.id, dto);
  }

  @Post()
  create(@Body() dto: CreateUsuarioDto) {
    return this.usuariosService.create(dto);
  }

  @Get()
  findAll() {
    return this.usuariosService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseObjectIdPipe1) id: string) {
    return this.usuariosService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseObjectIdPipe1) id: string,
    @Body() dto: UpdateUsuarioDto,
  ) {
    return this.usuariosService.update(id, dto);
  }

  @Patch(':id/desactivar')
  desactivar(@Param('id', ParseObjectIdPipe1) id: string) {
    return this.usuariosService.desactivar(id);
  }

  @Patch(':id/activar')
  activar(@Param('id', ParseObjectIdPipe1) id: string) {
    return this.usuariosService.activar(id);
  }
}
