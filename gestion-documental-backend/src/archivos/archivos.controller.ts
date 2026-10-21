import { Body, Controller, Get, Param, Patch, Post, Put, Query, Res, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { TipoArchivo } from '../common/enums/tipo-archivo.enum';
import { ParseObjectIdPipe1 } from '../common/pipes/parse-object-id.pipe';
import { ArchivosService } from './archivos.service';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { ContenidoArchivoDto } from './dto/contenido-archivo.dto';
import { ListarArchivosDto } from './dto/listar-archivos.dto';
import { MoverArchivoDto } from './dto/mover-archivo.dto';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { EditarContenidoDto } from './dto/editar-contenido.dto';

const TIPO_MIME: Record<TipoArchivo, string> = {
  [TipoArchivo.TXT]: 'text/plain',
  [TipoArchivo.MD]: 'text/markdown',
};

@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) { }

  @Post()
  @UseInterceptors(FileInterceptor('archivo'))
  subir(
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() dto: SubirArchivoDto,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.subir(archivo, dto, actual);
  }

  @Get()
  listar(
    @Query() filtros: ListarArchivosDto,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.listar(filtros, actual);
  }

  @Get(':id')
  obtener(
    @Param('id', ParseObjectIdPipe1) id: string,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.obtener(id, actual);
  }

  @Get(':id/contenido')
  async contenido(
    @Param('id', ParseObjectIdPipe1) id: string,
    @Query() consulta: ContenidoArchivoDto,
    @UsuarioActual() actual: UsuarioAutenticado,
    @Res({ passthrough: true }) respuesta: Response,
  ) {
    const descargar = consulta.descargar ?? false;
    const { archivo, flujo } = await this.archivosService.abrirContenido(id, actual, descargar);

    respuesta.set({
      'Content-Type': `${TIPO_MIME[archivo.tipo]}; charset=utf-8`,
      'Content-Length': String(archivo.tamano),
      'Content-Disposition': `${descargar ? 'attachment' : 'inline'}; filename*=UTF-8''${encodeURIComponent(archivo.nombre)}`,
    });
    return new StreamableFile(flujo);
  }

  @Patch(':id')
  actualizar(
    @Param('id', ParseObjectIdPipe1) id: string,
    @Body() dto: ActualizarArchivoDto,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.actualizar(id, dto, actual);
  }

  @Patch(':id/mover')
  mover(
    @Param('id', ParseObjectIdPipe1) id: string,
    @Body() dto: MoverArchivoDto,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.mover(id, dto, actual);
  }

  @Put(':id/contenido')
  @UseInterceptors(FileInterceptor('archivo'))
  editarContenido(
    @Param('id', ParseObjectIdPipe1) id: string,
    @UploadedFile() archivo: Express.Multer.File | undefined,
    @Body() dto: EditarContenidoDto,
    @UsuarioActual() actual: UsuarioAutenticado,
  ) {
    return this.archivosService.editarContenido(id, archivo, dto, actual);
  }
}