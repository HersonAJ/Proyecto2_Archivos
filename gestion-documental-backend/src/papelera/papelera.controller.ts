import { Controller, Delete, Get, HttpCode, Param, Post } from '@nestjs/common';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { ParseObjectIdPipe1 } from '../common/pipes/parse-object-id.pipe';
import { PapeleraService } from './papelera.service';


@Controller('papelera')
export class PapeleraController {
    constructor(private readonly papeleraService: PapeleraService) { }

    @Get()
    listar(@UsuarioActual() actual: UsuarioAutenticado) {
        return this.papeleraService.listar(actual);
    }

    @Post('archivos/:id')
    @HttpCode(200)
    enviarArchivo(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.enviarArchivo(id, actual);
    }

    @Post('carpetas/:id')
    @HttpCode(200)
    enviarCarpeta(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.enviarCarpeta(id, actual);
    }

    @Post('archivos/:id/restaurar')
    @HttpCode(200)
    restaurarArchivo(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.restaurarArchivo(id, actual);
    }

    @Post('carpetas/:id/restaurar')
    @HttpCode(200)
    restaurarCarpeta(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.restaurarCarpeta(id, actual);
    }

    @Delete('archivos/:id')
    eliminarArchivo(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.eliminarArchivo(id, actual);
    }

    @Delete('carpetas/:id')
    eliminarCarpeta(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.papeleraService.eliminarCarpeta(id, actual);
    }

    @Delete()
    vaciar(@UsuarioActual() actual: UsuarioAutenticado) {
        return this.papeleraService.vaciar(actual);
    }
}