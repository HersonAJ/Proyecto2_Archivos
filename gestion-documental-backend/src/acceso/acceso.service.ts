import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Types } from "mongoose";
import { NivelAcceso, NivelPermiso, RANGO_NIVEL } from "../common/enums/nivel-permiso.enum";
import { AccesoRepository } from "./repository/acceso.repository";

export interface AccesoRecurso {
    nivel: NivelAcceso;
    propietarioId: string;
    nombre: string;
    raizCompartida: string | null;
}

const MENSAJE_NIVEL: Record<NivelAcceso, string> = {
    LECTURA: 'No tienes permiso para ver este recurso',
    COMENTAR: 'Necesitas permiso para comentar',
    EDICION: 'Necesitas permiso de edicion para esta accion',
    PROPIETARIO: 'Solo el propietario puede ralizar esta accion',
};

@Injectable()
export class AccesoService {
    constructor(private readonly accesoRepository: AccesoRepository) {}

    async sobreCarpeta(usuarioId: string, carpetaId: string): Promise<AccesoRecurso | null> {
        const carpeta = await this.accesoRepository.carpetaActiva(carpetaId);
        if (!carpeta) return null;

        const propietarioId = carpeta.propietario.toString();
        const base = { propietarioId, nombre: carpeta.nombre };
        if (propietarioId === usuarioId) {
            return { ...base, nivel: 'PROPIETARIO', raizCompartida: null };
        }

        const cadena = [...carpeta.ancestros, carpeta._id];
        const permisos = await this.accesoRepository.permisos(usuarioId, cadena);
        const nivel = this.mejorNivel(permisos.map((p) => p.nivel));
        if (!nivel) return null;

        const raiz = cadena.find((id) => permisos.some((p) => p.recurso.equals(id)));
        return { ...base, nivel, raizCompartida: raiz?.toString() ?? null };
    }

    async sobreArchivo(usuarioId: string, archivoId: string): Promise<AccesoRecurso | null> {
        const archivo = await this.accesoRepository.archivoActivo(archivoId);
        if (!archivo) return null;

        const propietarioId = archivo.propietario.toString();
        const base = { propietarioId, nombre: archivo.nombre, raizCompartida: null };
        if (propietarioId === usuarioId) return { ...base, nivel: 'PROPIETARIO' };

        let recursos: Types.ObjectId[] = [archivo._id];
        if (archivo.carpeta) {
            const carpeta = await this.accesoRepository.carpetaActiva(archivo.carpeta.toString());
            if (carpeta) recursos = [ ...recursos, ...carpeta.ancestros, carpeta._id];
        }

        const permisos = await this.accesoRepository.permisos(usuarioId, recursos);
        const nivel = this.mejorNivel(permisos.map((p) => p.nivel));
        return nivel ? {...base, nivel } : null;
    }

    async exigirCarpeta(usuarioId: string, carpetaId: string, minimo: NivelAcceso) {
        const acceso = await this.sobreCarpeta(usuarioId, carpetaId);
        if (!acceso) throw new NotFoundException('Carpeta no encontrada');
        this.verificar(acceso.nivel, minimo);
        return acceso;
    }

    async exigirArchivo(usuarioId: string, archivoId: string, minimo: NivelAcceso) {
        const acceso = await this.sobreArchivo(usuarioId, archivoId);
        if (!acceso) throw new NotFoundException('Archivo no encontrado');
        this.verificar(acceso.nivel, minimo);
        return acceso;
    }

    async nivelesDirectos(usuarioId: string, recursos: Types.ObjectId[]) {
        const permisos = await this.accesoRepository.permisos(usuarioId, recursos);
        return new Map(permisos.map((p) => [p.recurso.toString(), p.nivel]));
    }

    mayor(a: NivelAcceso, b: NivelAcceso | undefined): NivelAcceso {
        return b && RANGO_NIVEL[b] > RANGO_NIVEL[a] ? b : a;
    }

    private mejorNivel(niveles: NivelPermiso[]): NivelPermiso |  null {
        return niveles.reduce<NivelPermiso | null>(
            (mejor, nivel) => (mejor === null || RANGO_NIVEL[nivel] > RANGO_NIVEL[mejor] ? nivel : mejor),
            null,
        );
    }

    private verificar(nivel: NivelAcceso, minimo: NivelAcceso) {
        if (RANGO_NIVEL[nivel] < RANGO_NIVEL[minimo]) {
            throw new ForbiddenException(MENSAJE_NIVEL[minimo]);
        }
    }
}