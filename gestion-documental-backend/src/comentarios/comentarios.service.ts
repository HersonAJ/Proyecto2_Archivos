import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AccesoService } from "../acceso/acceso.service";
import { ActividadesService } from "../acciones/actividades.service";
import type { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { AccionActividad } from "../common/enums/accion-actividad.enum";
import { NivelPermiso } from "../common/enums/nivel-permiso.enum";
import { TipoRecurso } from "../common/enums/tipo-recurso.enum";
import { CrearComentarioDto } from "./dto/crear-comentario.dto";
import { ComentariosRepository } from "./repository/comentarios.repository";

@Injectable()
export class ComentariosService {

    constructor(
        private readonly comentariosRepository: ComentariosRepository,
        private readonly accesoService: AccesoService,
        private readonly actividadesService: ActividadesService,
    ) { }

    async listar(archivoId: string, actual: UsuarioAutenticado) {
        await this.accesoService.exigirArchivo(actual.id, archivoId, NivelPermiso.LECTURA);
        return this.comentariosRepository.listarPorArchivo(archivoId);
    }

    async crear(archivoId: string, dto: CrearComentarioDto, actual: UsuarioAutenticado) {
        const acceso = await this.accesoService.exigirArchivo(actual.id, archivoId, NivelPermiso.COMENTAR);

        const creado = await this.comentariosRepository.crear({
            archivo: archivoId,
            autor: actual.id,
            texto: dto.texto,
        });

        await this.actividadesService.registrar({
            usuario: actual.id,
            propietarioRecurso: acceso.propietarioId,
            accion: AccionActividad.COMENTAR,
            tipoRecurso: TipoRecurso.ARCHIVO,
            recurso: archivoId,
            nombreRecurso: acceso.nombre,
            detalles: { extracto: dto.texto.slice(0, 80) },
        });
        return creado;
    }

    async eliminar(id: string, actual: UsuarioAutenticado) {
        const comentario = await this.comentariosRepository.buscarPorId(id);
        if (!comentario) throw new NotFoundException('Comentario no encontrado');

        const acceso = await this.accesoService.sobreArchivo(actual.id, comentario.archivo.toString());
        if (!acceso) throw new NotFoundException('Comentario no encontrado');

        const esAutor = comentario.autor.equals(actual.id);
        if (!esAutor && acceso.nivel !== 'PROPIETARIO') {
            throw new ForbiddenException('Solo el autor o propietario del archivo puede borrar el comentario');
        }

        await this.comentariosRepository.eliminar(id);
        return { eliminado: true };
    }
}