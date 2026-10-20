import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { AccesoService } from '../acceso/acceso.service';
import { ActividadesService } from '../acciones/actividades.service';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { NivelAcceso, NivelPermiso } from '../common/enums/nivel-permiso.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';
import { CreateCarpetaDto } from './dto/create-carpeta.dto';
import { MoverCarpetaDto } from './dto/mover-carpeta.dto';
import { RenombrarCarpetaDto } from './dto/renombrar-carpeta.dto';
import { CarpetaDocument } from './entities/carpeta.entity';
import { CarpetasRepository } from './repository/carpetas.repository';

@Injectable()
export class CarpetaService {
    constructor(
        private readonly carpetasRepository: CarpetasRepository,
        private readonly actividadesService: ActividadesService,
        private readonly accesoService: AccesoService,
    ) { }

    async crear(dto: CreateCarpetaDto, actual: UsuarioAutenticado) {
        const padre = dto.carpetaPadre
            ? await this.obtenerActiva(dto.carpetaPadre, actual.id)
            : null;
        const ancestros = padre ? [...padre.ancestros, padre._id] : [];

        const carpeta = await this.conNombreUnico(() =>
            this.carpetasRepository.crear({
                nombre: dto.nombre,
                propietario: actual.id,
                carpetaPadre: padre?._id ?? null,
                ancestros,
            }),
        );

        await this.actividadesService.registrar({
            usuario: actual.id,
            accion: AccionActividad.CREAR,
            tipoRecurso: TipoRecurso.CARPETA,
            recurso: carpeta.id,
            nombreRecurso: carpeta.nombre,
            detalles: { carpetaPadre: padre?.id ?? null },
        });
        return carpeta;
    }

    async listar(padre: string | undefined, actual: UsuarioAutenticado) {
        if (!padre) {
            const propias = await this.carpetasRepository.listarPorPadre(actual.id, null);
            return propias.map((c) => this.conNivel(c, 'PROPIETARIO'));
        }

        const acceso = await this.accesoService.exigirCarpeta(actual.id, padre, NivelPermiso.LECTURA);
        const hijas = await this.carpetasRepository.listarPorPadre(acceso.propietarioId, padre);
        if (acceso.nivel === 'PROPIETARIO') return hijas.map((c) => this.conNivel(c, 'PROPIETARIO'));
        const directos = await this.accesoService.nivelesDirectos(actual.id, hijas.map((c) => c._id));
        return hijas.map((c) =>
            this.conNivel(c, this.accesoService.mayor(acceso.nivel, directos.get(c.id))),
        );
    }

    // Devuelve la carpeta (con el nivel del usuario) y su ruta
    async obtener(id: string, actual: UsuarioAutenticado) {
        const acceso = await this.accesoService.exigirCarpeta(actual.id, id, NivelPermiso.LECTURA);
        const carpeta = await this.carpetasRepository.buscarActivaPorId(id);
        if (!carpeta) throw new NotFoundException('Carpeta no encontrada');

        let ancestros = carpeta.ancestros;
        if (acceso.raizCompartida) {
            const posicion = ancestros.findIndex((a) => a.toString() === acceso.raizCompartida);
            ancestros = posicion >= 0 ? ancestros.slice(posicion) : [];
        }

        const encontradas = await this.carpetasRepository.nombresDe(ancestros);
        const nombrePorId = new Map(encontradas.map((c) => [c._id.toString(), c.nombre]));
        const ruta = ancestros.map((ancestro) => ({
            _id: ancestro.toString(),
            nombre: nombrePorId.get(ancestro.toString()) ?? '',
        }));
        return { carpeta: this.conNivel(carpeta, acceso.nivel), ruta };
    }

    async renombrar(id: string, dto: RenombrarCarpetaDto, actual: UsuarioAutenticado) {
        const carpeta = await this.obtenerActiva(id, actual.id);
        if (carpeta.nombre === dto.nombre) return carpeta;

        const actualizada = await this.conNombreUnico(() =>
            this.carpetasRepository.renombrar(carpeta.id, dto.nombre),
        );
        if (!actualizada) throw new NotFoundException('Carpeta no encontrada');

        await this.actividadesService.registrar({
            usuario: actual.id,
            accion: AccionActividad.RENOMBRAR,
            tipoRecurso: TipoRecurso.CARPETA,
            recurso: carpeta.id,
            nombreRecurso: dto.nombre,
            detalles: { anterior: carpeta.nombre, nuevo: dto.nombre },
        });
        return actualizada;
    }

    async mover(id: string, dto: MoverCarpetaDto, actual: UsuarioAutenticado) {

        const carpeta = await this.obtenerActiva(id, actual.id);
        const destino = dto.carpetaPadre
            ? await this.obtenerActiva(dto.carpetaPadre, actual.id)
            : null;

        const padreActual = carpeta.carpetaPadre?.toString() ?? null;
        const padreNuevo = destino?.id ?? null;

        if (padreActual === padreNuevo) {
            throw new BadRequestException('La carpeta ya está en esa ubicación');
        }
        if (
            destino &&
            (destino.id === carpeta.id ||
                destino.ancestros.some((ancestro) => ancestro.equals(carpeta._id)))
        ) {
            throw new BadRequestException(
                'No se puede mover una carpeta dentro de sí misma ni de sus subcarpetas',
            );
        }
        const hayNombreRepetido = await this.carpetasRepository.existeHermana(
            actual.id,
            padreNuevo,
            carpeta.nombre,
            carpeta.id,
        );
        if (hayNombreRepetido) this.lanzarNombreRepetido();

        const nuevosAncestros = destino ? [...destino.ancestros, destino._id] : [];
        await this.conNombreUnico(() =>
            this.carpetasRepository.moverConDescendientes(carpeta.id, padreNuevo, nuevosAncestros),
        );

        await this.actividadesService.registrar({
            usuario: actual.id,
            accion: AccionActividad.MOVER,
            tipoRecurso: TipoRecurso.CARPETA,
            recurso: carpeta.id,
            nombreRecurso: carpeta.nombre,
            detalles: { desde: padreActual, hasta: padreNuevo },
        });
        return this.obtenerActiva(id, actual.id);
    }
    buscarActivaDelUsuario(id: string, propietario: string) {
        return this.obtenerActiva(id, propietario);
    }

    private async obtenerActiva(id: string, usuarioId: string) {
        const carpeta = await this.carpetasRepository.buscarActiva(id, usuarioId);
        if (carpeta) return carpeta;
        await this.accesoService.exigirCarpeta(usuarioId, id, 'PROPIETARIO');
        throw new NotFoundException('Carpeta no encontrada');
    }

    // Agrega el nivel de acceso del usuario a los datos de la carpeta
    private conNivel(carpeta: CarpetaDocument, nivel: NivelAcceso) {
        return { ...carpeta.toJSON(), nivel };
    }

    private async conNombreUnico<T>(operacion: () => Promise<T>): Promise<T> {
        try {
            return await operacion();
        } catch (error) {
            if (esClaveDuplicada(error)) this.lanzarNombreRepetido();
            throw error;
        }
    }

    private lanzarNombreRepetido(): never {
        throw new ConflictException('Ya existe una carpeta con ese nombre en esta ubicación');
    }
}