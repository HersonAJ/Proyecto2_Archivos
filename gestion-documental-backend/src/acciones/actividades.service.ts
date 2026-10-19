import { Injectable, Logger } from "@nestjs/common";
import { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { RolUsuario } from "../common/enums/rol-usuario.enum";
import { FiltrarActividadesDto } from "./dto/filtrar-actividades.dto";
import { DatosActividad } from "./interfaces/actividad.interface";
import { ActividadesRepository } from "./repository/actividades.repository";
import { FiltroActividades } from "./interfaces/actividad.interface";
import { Usuario } from "../usuarios/entities/usuario.entity";

@Injectable()
export class ActividadesService {
    private readonly logger = new Logger(ActividadesService.name);

    constructor(private readonly actividadesRepository: ActividadesRepository) {}

    async registrar(datos: DatosActividad): Promise<void> {
        try {
            await this.actividadesRepository.crear({
                ...datos,
                propietarioRecurso: datos.propietarioRecurso ?? datos.usuario,
            });
        } catch (error) {
            this.logger.error(
                `No se pudo registrar ${datos.accion} sobre ${datos.nombreRecurso}`,
                error instanceof Error ? error.stack : undefined,
            );
        }
    }

    async listar(filtros: FiltrarActividadesDto, actual: UsuarioAutenticado) {
        const { pagina, limite, ...criterios } = filtros;
        const filtro: FiltroActividades = { ...criterios };
        if (actual.rol !== RolUsuario.ADMIN) {
            filtro.participante = actual.id;
        }

        const { datos, total } = await this.actividadesRepository.buscar(filtro, pagina, limite);
        return { datos, total, pagina, limite };
    }
}