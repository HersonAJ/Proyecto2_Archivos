import { Controller, Get, Post, Body, Patch, Param } from '@nestjs/common';
import { UsuariosService } from './usuarios.service';
import { CreateUsuarioDto } from './dto/create-usuario.dto';
import { UpdateUsuarioDto } from './dto/update-usuario.dto';
import { ParseObjectIdPipe1 } from '../common/pipes/parse-object-id.pipe';

@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

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
