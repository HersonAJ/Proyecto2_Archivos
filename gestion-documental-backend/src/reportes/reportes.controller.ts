import { Controller, Get } from '@nestjs/common';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { Roles } from '../autenticacion/decorators/roles.decorator';
import { ReportesService } from './reportes.service';

@Controller('reportes')
@Roles(RolUsuario.ADMIN)
export class ReportesController {
    constructor(private readonly reportesService: ReportesService) { }

    @Get('actividad/por-tipo')
    operacionesPorTipo() {
        return this.reportesService.operacionesPorTipo();
    }
}