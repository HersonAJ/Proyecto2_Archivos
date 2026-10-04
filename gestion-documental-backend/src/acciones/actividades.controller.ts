import { Body, Controller, Get, Post, Query } from "@nestjs/common";
import { Types } from "mongoose";
import { UsuarioActual } from "../autenticacion/decorators/usuario-actual.decorator";
import type { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { AccionActividad } from "../common/enums/accion-actividad.enum";
import { TipoRecurso } from "../common/enums/tipo-recurso.enum";
import { ActividadesService } from "./actividades.service";
import { FiltrarActividadesDto } from "./dto/filtrar-actividades.dto";

@Controller('actividades')
export class ActividadesController {
    constructor(private readonly actividadesService: ActividadesService) {}

    @Get()
    listar(
        @Query() filtros: FiltrarActividadesDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.actividadesService.listar(filtros, actual);
    }

    @Post('prueba')
    async prueba(
        @UsuarioActual() actual: UsuarioAutenticado,
        @Body('accion') accion: AccionActividad = AccionActividad.SUBIR,
    ) {
        await this.actividadesService.registrar({
            usuario: actual.id,
            accion,
            tipoRecurso: TipoRecurso.ARCHIVO,
            recurso: new Types.ObjectId().toString(),
            nombreRecurso: 'informe.txt',
            detalles: { tamano: 120 },
        });
        return { ok: true };
    }
}
