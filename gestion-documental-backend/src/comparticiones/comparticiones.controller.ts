import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { ParseObjectIdPipe1 } from '../common/pipes/parse-object-id.pipe';
import { ComparticionesService } from './comparticiones.service';
import { CambiarNivelDto } from './dto/cambiar-nivel.dto';
import { CompartirDto } from './dto/compartir.dt';
import { ConsultaRecursoDto } from './dto/consulta-recurso.dto';

@Controller('comparticiones')
export class ComparticionesController {
    constructor(private readonly comparticionesService: ComparticionesService) { }

    @Post()
    compartir(@Body() dto: CompartirDto, @UsuarioActual() actual: UsuarioAutenticado) {
        return this.comparticionesService.compartir(dto, actual);
    }

    @Get('conmigo')
    recibidas(@UsuarioActual() actual: UsuarioAutenticado) {
        return this.comparticionesService.recibidas(actual);
    }

    @Get('por-mi')
    otorgadas(@UsuarioActual() actual: UsuarioAutenticado) {
        return this.comparticionesService.otorgadas(actual);
    }

    @Get('recurso')
    quienTieneAcceso(
        @Query() consulta: ConsultaRecursoDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comparticionesService.quienTieneAcceso(consulta, actual);
    }

    @Patch(':id')
    cambiarNivel(
        @Param('id', ParseObjectIdPipe1) id: string,
        @Body() dto: CambiarNivelDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comparticionesService.cambiarNivel(id, dto, actual);
    }

    @Delete(':id')
    retirar(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.comparticionesService.retirar(id, actual);
    }
}