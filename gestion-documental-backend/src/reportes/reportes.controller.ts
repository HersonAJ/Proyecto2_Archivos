import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { ReportesService } from './reportes.service';
import { Query } from '@nestjs/common';
import { UsuarioActual } from '../autenticacion/decorators/usuario-actual.decorator';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { ReportePorUsuarioDto } from './dto/reporte-usuario.dto';

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
    
}