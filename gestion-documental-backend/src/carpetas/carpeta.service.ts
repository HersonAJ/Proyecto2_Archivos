import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { ActividadesService } from "../acciones/actividades.service";
import type { UsuarioAutenticado } from "../autenticacion/interfaces/solicitud-autenticada.interface";
import { AccionActividad } from "../common/enums/accion-actividad.enum";
import { TipoRecurso } from "../common/enums/tipo-recurso.enum";
import { esClaveDuplicada } from "../common/utils/errores-mongo.util";
import { CreateCarpetaDto } from "./dto/create-carpeta.dto";
import { MoverCarpetaDto } from "./dto/mover-carpeta.dto";
import { RenombrarCarpetaDto } from "./dto/renombrar-carpeta.dto";
import { CarpetasRepository } from "./repository/carpetas.repository";

@Injectable()
export class CarpetaService {
    constructor(
        private readonly carpetasRepository: CarpetasRepository,
        private readonly actividadesService: ActividadesService,
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
        if (padre) await this.obtenerActiva(padre, actual.id);
        return this.carpetasRepository.listarPorPadre(actual.id, padre ?? null);
    }

    //devuelve la carpeta y su ruta
    async obtener(id: string, actual: UsuarioAutenticado) {
        const carpeta = await this.obtenerActiva(id, actual.id);
        const encontradas = await this.carpetasRepository.nombresDe(carpeta.ancestros);
        const nombrePorId = new Map(
            encontradas.map((c) => [c._id.toString(), c.nombre]),
        );

        const ruta = carpeta.ancestros.map((ancestro) => ({
            _id: ancestro.toString(),
            nombre: nombrePorId.get(ancestro.toString()) ?? '',
        }));
        return { carpeta, ruta };
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

    //verificar si si mongo tiene transacciones
    async mover(id: string, dto: MoverCarpetaDto, actual: UsuarioAutenticado) {
        //1 calidar todo antes de escribir
        const carpeta = await this.obtenerActiva(id, actual.id);
        const destino = dto.carpetaPadre
            ? await this.obtenerActiva(dto.carpetaPadre, actual.id)
            : null

        const padreActual = carpeta.carpetaPadre?.toString() ?? null;
        const padreNuevo = destino?.id ?? null;

        if (padreActual === padreNuevo) {
            throw new BadRequestException('La carpeta ya esta en esa ubicacion');
        }

        //ciclo: le destino es la propia carpeta o una de sus subcarpetas
        if (
            destino &&
            (destino.id === carpeta.id ||
                destino.ancestros.some((ancestro) => ancestro.equals(carpeta._id)))
        ) {
            throw new BadRequestException(
                'No se puede nover una carpeta dentro de si misma ni de sus subcarpetas',
            );
        }

        const hayNombreRepedito = await this.carpetasRepository.existeHermana(
            actual.id,
            padreNuevo,
            carpeta.nombre,
            carpeta.id,
        );
        if (hayNombreRepedito) this.lanzarNombreRepetido();

        //2 escribir, solo un comando actualiza la carpeta y todos sus descendientes
        const nuevosAncestros = destino ? [...destino.ancestros, destino._id] : [];
        await this.conNombreUnico(() =>
            this.carpetasRepository.moverConDescendientes(
                carpeta.id,
                padreNuevo,
                nuevosAncestros,
            ),
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

    //si la carpeta no existe, esta en la papelara o es de otro usuario: 404
    private async obtenerActiva(id: string, propietario: string) {
        const carpeta = await this.carpetasRepository.buscarActiva(id, propietario);
        if (!carpeta) throw new NotFoundException('Carpeta no encontrada');
        return carpeta;
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
        throw new ConflictException(
            'Ya existe una carpeta con ese nombre en esta ubicacion',
        );
    }

    buscarActivaDelUsuario(id: string, propietario: string) {
        return this.obtenerActiva(id, propietario);
    }
}