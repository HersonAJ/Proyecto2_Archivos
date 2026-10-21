import { Body, Controller, Delete, Get, Param, Post } from "@nestjs/common";
import { UsuarioActual } from "../autenticacion/decorators/usuario-actual.decorator";
import type { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { ParseObjectIdPipe1 } from "../common/pipes/parse-object-id.pipe";
import { ComentariosService } from "./comentarios.service";
import { CrearComentarioDto } from "./dto/crear-comentario.dto";

@Controller()
export class ComentariosController {
    constructor( private readonly comentariosService: ComentariosService) {}

    @Get('archivos/:id/comentarios')
    listar(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comentariosService.listar(id, actual);
    }

    @Post('archivos/:id/comentarios')
    crear(
        @Param('id', ParseObjectIdPipe1) id: string,
        @Body() dto: CrearComentarioDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comentariosService.crear(id, dto, actual);
    }

    @Delete('comentarios/:id')
    eliminar(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comentariosService.eliminar(id, actual);
    }
}