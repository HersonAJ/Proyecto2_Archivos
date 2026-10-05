import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { UsuarioActual } from "../autenticacion/decorators/usuario-actual.decorator";
import type { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { ParseObjectIdPipe1 } from "../common/pipes/parse-object-id.pipe";
import { CarpetaService } from "./carpeta.service";
import { CreateCarpetaDto } from "./dto/create-carpeta.dto";
import { ListarCarpetasDto } from "./dto/lista-carpetas.dto";
import { MoverCarpetaDto } from "./dto/mover-carpeta.dto";
import { RenombrarCarpetaDto } from "./dto/renombrar-carpeta.dto";

@Controller('carpetas')
export class CarpetasController {
    constructor(private readonly carpetasService: CarpetaService) {}

    @Post()
    crear(@Body() dto: CreateCarpetaDto, @UsuarioActual() actual: UsuarioAutenticado) {
        return this.carpetasService.crear(dto, actual);
    }

    @Get()
    listar(
        @Query() filtros: ListarCarpetasDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.carpetasService.listar(filtros.padre, actual);
    }

    @Get(':id')
    obtener(
        @Param('id', ParseObjectIdPipe1) id: string,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.carpetasService.obtener(id, actual);
    }

    @Patch(':id')
    renombrar(
        @Param('id', ParseObjectIdPipe1) id: string,
        @Body() dto: RenombrarCarpetaDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.carpetasService.renombrar(id, dto, actual);
    }

    @Patch(':id/mover')
    mover(
        @Param('id', ParseObjectIdPipe1) id: string,
        @Body() dto: MoverCarpetaDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.carpetasService.mover(id, dto, actual);
    }
}