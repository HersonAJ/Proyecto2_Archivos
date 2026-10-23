import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import { Query } from '@nestjs/common';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { ReportePorUsuarioDto } from './dto/reporte-usuario.dto';
import { ReporteHistorialDto } from './dto/reporte-historial.dto';
import { ReporteFechasDto } from './dto/reporte-fechas.dto';
import { ReporteTopDto } from './dto/reporte-top.dto';

@Controller('reportes')
@Roles(RolUsuario.ADMIN)
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    @Get('actividad/por-tipo')
    operacionesPorTipo() {
        return this.reportesService.operacionesPorTipo();
    }

    @Get('archivos/por-tipo')
    archivosPorTipo() {
        return this.reportesService.archivosPorTipo();
    }

    @Get('comparticiones/otorgadas')
    @Roles(RolUsuario.ADMIN, RolUsuario.USUARIO)
    comparticionesOtorgadas(
    @Query() dto: ReportePorUsuarioDto,
    @UsuarioActual() actual: UsuarioAutenticado,
    ) {
    return this.reportesService.comparticionesOtorgadas(dto, actual);
    }

    @Get('comparticiones/recibidas')
    @Roles(RolUsuario.ADMIN, RolUsuario.USUARIO)
    comparticionesRecibidas(
        @Query() dto: ReportePorUsuarioDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.reportesService.comparticionesRecibidas(dto, actual);
    }

    @Get('actividad/historial')
    @Roles(RolUsuario.ADMIN, RolUsuario.USUARIO)
    historialActividad(
        @Query() dto: ReporteHistorialDto,
        @UsuarioActual() actual: UsuarioAutenticado,
    ) {
        return this.reportesService.historialActividades(dto, actual);
    }

    @Get('archivos/por-fechas')
    archivosPorFechas(@Query() dto: ReporteFechasDto) {
        return this.reportesService.archivosPorFecha(dto);
    }
    
    @Get('archivos/mas-operaciones')
    archivosConMasOperaciones(@Query() dto: ReporteTopDto) {
        return this.reportesService.archivosConMasOperaciones(dto);
    }
}