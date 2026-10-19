import { BadRequestException, ConflictException, Injectable, Logger, NotFoundException, } from '@nestjs/common';
import { Types } from 'mongoose';
import { ActividadesService } from '../acciones/actividades.service';
import { ArchivosRepository } from '../archivos/repository/archivos.repository';
import { ContenidosRepository } from '../archivos/repository/contenidos.repository';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { CarpetasRepository } from '../carpetas/repository/carpetas.repository';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';
import { nombreAlternativo } from '../common/utils/nombres.util';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ComparticionesRepository } from '../comparticiones/repository/comparticiones.repository';

const LIMITE_LISTA = 500; // tope de elementos que devuelve la lista de la papelera
const NO_EN_PAPELERA = 'El elemento no esta en la papelera';

// usa las marcas enPapelera / fechaEliminacion / eliminadaPorCascada de cada documento.
@Injectable()
export class PapeleraService {
    private readonly logger = new Logger(PapeleraService.name);

    constructor(
        private readonly carpetasRepository: CarpetasRepository,
        private readonly archivosRepository: ArchivosRepository,
        private readonly contenidosRepository: ContenidosRepository,
        private readonly usuariosService: UsuariosService,
        private readonly actividadesService: ActividadesService,
        private readonly comparticionesRepository: ComparticionesRepository,
    ) { }

    async listar(actual: UsuarioAutenticado) {
        const [carpetas, archivos] = await Promise.all([
            this.carpetasRepository.listarRaicesEnPapelera(actual.id, LIMITE_LISTA),
            this.archivosRepository.listarRaicesEnPapelera(actual.id, LIMITE_LISTA),
        ]);
        return { carpetas, archivos };
    }

    // Enviar a la papelera
    async enviarArchivo(id: string, actual: UsuarioAutenticado) {
        const archivo = await this.archivosRepository.buscarActivo(id, actual.id);
        if (!archivo) throw new NotFoundException('Archivo no encontrado');

        const enPapelera = await this.archivosRepository.enviarAPapelera(archivo.id, new Date());
        if (!enPapelera) throw new NotFoundException('Archivo no encontrado');

        await this.registrar(actual, AccionActividad.ELIMINAR, TipoRecurso.ARCHIVO, archivo.id, archivo.nombre, {
            carpeta: archivo.carpeta?.toString() ?? null,
        });
        return enPapelera;
    }

    async enviarCarpeta(id: string, actual: UsuarioAutenticado) {
        const carpeta = await this.carpetasRepository.buscarActiva(id, actual.id);
        if (!carpeta) throw new NotFoundException('Carpeta no encontrada');

        // Una sola fecha para todo el lote: luego sirve para restaurar exactamente lo que se fue con ella
        const fecha = new Date();
        const subcarpetas = await this.carpetasRepository.idsDescendientesActivas(carpeta.id);

        const archivos = await this.archivosRepository.enviarAPapeleraPorCarpetas(
            [carpeta._id, ...subcarpetas],
            fecha,
        );
        await this.carpetasRepository.enviarDescendientesAPapelera(carpeta.id, fecha);
        const enPapelera = await this.carpetasRepository.enviarAPapelera(carpeta.id, fecha);
        if (!enPapelera) throw new NotFoundException('Carpeta no encontrada');

        await this.registrar(actual, AccionActividad.ELIMINAR, TipoRecurso.CARPETA, carpeta.id, carpeta.nombre, {
            subcarpetas: subcarpetas.length,
            archivos,
        });
        return enPapelera;
    }

    // Restaurar

    async restaurarArchivo(id: string, actual: UsuarioAutenticado) {
        const archivo = await this.archivosRepository.buscarRaizEnPapelera(id, actual.id);
        if (!archivo) throw new NotFoundException(NO_EN_PAPELERA);

        // Vuelve a su carpeta original solo si sigue activa; si no, a la raiz
        let destino: Types.ObjectId | null = null;
        let enUbicacionOriginal = true;
        if (archivo.carpeta) {
            const padre = await this.carpetasRepository.buscarActiva(archivo.carpeta.toString(), actual.id);
            if (padre) destino = padre._id;
            else enUbicacionOriginal = false;
        }

        // Si ya hay algo con ese nombre en el destino, se restaura con "(restaurado)"
        const nombre = await this.elegirNombre(
            archivo.nombre,
            { conExtension: true, maximo: 255, etiqueta: 'restaurado' },
            async (candidato) =>
                (await this.archivosRepository.existeHermano(actual.id, destino, candidato)) !== null,
        );

        const restaurado = await this.conNombreUnico(() =>
            this.archivosRepository.restaurarRaiz(archivo.id, { nombre, carpeta: destino }),
        );
        if (!restaurado) throw new NotFoundException(NO_EN_PAPELERA);

        await this.registrar(actual, AccionActividad.RESTAURAR, TipoRecurso.ARCHIVO, archivo.id, nombre, {
            nombreOriginal: archivo.nombre,
            carpeta: destino?.toString() ?? null,
            enUbicacionOriginal,
        });
        return { elemento: restaurado, enUbicacionOriginal, nombreModificado: nombre !== archivo.nombre };
    }

    async restaurarCarpeta(id: string, actual: UsuarioAutenticado) {
        const carpeta = await this.carpetasRepository.buscarRaizEnPapelera(id, actual.id);
        if (!carpeta) throw new NotFoundException(NO_EN_PAPELERA);
        const fechaLote = carpeta.fechaEliminacion;
        if (!fechaLote) throw new BadRequestException('La carpeta no tiene fecha de eliminacion');

        // Vuelve a su carpeta original solo si sigue activa; si no, a la raiz
        let destino: Types.ObjectId | null = null;
        let enUbicacionOriginal = true;
        if (carpeta.carpetaPadre) {
            const padre = await this.carpetasRepository.buscarActiva(carpeta.carpetaPadre.toString(), actual.id);
            if (padre) destino = padre._id;
            else enUbicacionOriginal = false;
        }

        if (!enUbicacionOriginal) {
            await this.carpetasRepository.moverConDescendientes(carpeta.id, null, []);
        }

        const nombre = await this.elegirNombre(
            carpeta.nombre,
            { conExtension: false, maximo: 100, etiqueta: 'restaurada' },
            async (candidato) =>
                (await this.carpetasRepository.existeHermana(
                    actual.id,
                    destino?.toString() ?? null,
                    candidato,
                    carpeta.id,
                )) !== null,
        );

        const subcarpetas = await this.carpetasRepository.idsSubarbol(carpeta.id);
        const archivos = await this.archivosRepository.restaurarPorCarpetas(
            [carpeta._id, ...subcarpetas],
            fechaLote,
        );
        const subcarpetasRestauradas = await this.carpetasRepository.restaurarDescendientes(carpeta.id, fechaLote);

        const restaurada = await this.conNombreUnico(() =>
            this.carpetasRepository.restaurarRaiz(carpeta.id, { nombre, carpetaPadre: destino }),
        );
        if (!restaurada) throw new NotFoundException(NO_EN_PAPELERA);

        await this.registrar(actual, AccionActividad.RESTAURAR, TipoRecurso.CARPETA, carpeta.id, nombre, {
            nombreOriginal: carpeta.nombre,
            carpetaPadre: destino?.toString() ?? null,
            enUbicacionOriginal,
            subcarpetas: subcarpetasRestauradas,
            archivos,
        });
        return { elemento: restaurada, enUbicacionOriginal, nombreModificado: nombre !== carpeta.nombre };
    }

    // Eliminar definitivamente 

    async eliminarArchivo(id: string, actual: UsuarioAutenticado) {
        const archivo = await this.archivosRepository.buscarRaizEnPapelera(id, actual.id);
        if (!archivo) throw new NotFoundException(NO_EN_PAPELERA);

        const eliminados = await this.archivosRepository.eliminarUnoEnPapelera(archivo.id);
        if (eliminados === 0) throw new NotFoundException(NO_EN_PAPELERA);
        await this.comparticionesRepository.eliminarPorRecursos([archivo._id]);
        await this.eliminarContenidos([archivo.contenidoId.toString()]);
        await this.usuariosService.ajustarAlmacenamiento(actual.id, -archivo.tamano);

        await this.registrar(actual, AccionActividad.ELIMINAR_DEFINITIVO, TipoRecurso.ARCHIVO, archivo.id, archivo.nombre, {
            tamano: archivo.tamano,
        });
        return { archivos: 1, carpetas: 0, bytes: archivo.tamano };
    }

    async eliminarCarpeta(id: string, actual: UsuarioAutenticado) {
        const carpeta = await this.carpetasRepository.buscarRaizEnPapelera(id, actual.id);
        if (!carpeta) throw new NotFoundException(NO_EN_PAPELERA);

        const subcarpetas = await this.carpetasRepository.idsSubarbol(carpeta.id);
        const idsCarpetas = [carpeta._id, ...subcarpetas];
        const archivos = await this.archivosRepository.buscarPorCarpetas(idsCarpetas, actual.id);
        const bytes = archivos.reduce((suma, a) => suma + a.tamano, 0);

        await this.archivosRepository.eliminarPorIds(archivos.map((a) => a._id));
        await this.carpetasRepository.eliminarPorIds(idsCarpetas);
            await this.comparticionesRepository.eliminarPorRecursos([
      ...idsCarpetas,
      ...archivos.map((a) => a._id),
    ]);
        await this.eliminarContenidos(archivos.map((a) => a.contenidoId.toString()));
        if (bytes > 0) await this.usuariosService.ajustarAlmacenamiento(actual.id, -bytes);

        await this.registrar(actual, AccionActividad.ELIMINAR_DEFINITIVO, TipoRecurso.CARPETA, carpeta.id, carpeta.nombre, {
            subcarpetas: subcarpetas.length,
            archivos: archivos.length,
            bytes,
        });
        return { carpetas: idsCarpetas.length, archivos: archivos.length, bytes };
    }

    async vaciar(actual: UsuarioAutenticado) {
        const [raicesCarpetas, raicesArchivos, idsCarpetas, archivos] = await Promise.all([
            this.carpetasRepository.listarRaicesEnPapelera(actual.id, LIMITE_LISTA),
            this.archivosRepository.listarRaicesEnPapelera(actual.id, LIMITE_LISTA),
            this.carpetasRepository.idsEnPapelera(actual.id),
            this.archivosRepository.buscarTodosEnPapelera(actual.id),
        ]);
        const bytes = archivos.reduce((suma, a) => suma + a.tamano, 0);

        await this.archivosRepository.eliminarPorIds(archivos.map((a) => a._id));
        await this.carpetasRepository.eliminarPorIds(idsCarpetas);

            await this.comparticionesRepository.eliminarPorRecursos([
      ...idsCarpetas,
      ...archivos.map((a) => a._id),
    ]);
        await this.eliminarContenidos(archivos.map((a) => a.contenidoId.toString()));
        if (bytes > 0) await this.usuariosService.ajustarAlmacenamiento(actual.id, -bytes);

        await Promise.all([
            ...raicesCarpetas.map((c) =>
                this.registrar(actual, AccionActividad.ELIMINAR_DEFINITIVO, TipoRecurso.CARPETA, c.id, c.nombre, { vaciado: true }),
            ),
            ...raicesArchivos.map((a) =>
                this.registrar(actual, AccionActividad.ELIMINAR_DEFINITIVO, TipoRecurso.ARCHIVO, a.id, a.nombre, {
                    vaciado: true,
                    tamano: a.tamano,
                }),
            ),
        ]);
        return { carpetas: idsCarpetas.length, archivos: archivos.length, bytes };
    }

    // Auxiliares

    // Devuelve el nombre original si esta libre si no, prueba "(restaurado)"
    private async elegirNombre(
        nombre: string,
        opciones: { conExtension: boolean; maximo: number; etiqueta: 'restaurado' | 'restaurada' },
        existe: (nombre: string) => Promise<boolean>,
    ): Promise<string> {
        if (!(await existe(nombre))) return nombre;
        for (let intento = 1; intento <= 20; intento++) {
            const candidato = nombreAlternativo(nombre, intento, opciones);
            if (!(await existe(candidato))) return candidato;
        }
        throw new ConflictException('No se encontro un nombre libre para restaurar el elemento');
    }

    // Borra contenidos de GridFS de 20 en 20. Un fallo se registra en el log y no detiene el resto.
    private async eliminarContenidos(ids: string[]) {
        for (let i = 0; i < ids.length; i += 20) {
            const lote = ids.slice(i, i + 20);
            const resultados = await Promise.allSettled(
                lote.map((idContenido) => this.contenidosRepository.eliminar(idContenido)),
            );
            resultados.forEach((resultado, n) => {
                if (resultado.status === 'rejected') {
                    this.logger.error(`No se pudo borrar el contenido ${lote[n]} de GridFS`, String(resultado.reason));
                }
            });
        }
    }

    private async conNombreUnico<T>(operacion: () => Promise<T>): Promise<T> {
        try {
            return await operacion();
        } catch (error) {
            if (esClaveDuplicada(error)) {
                throw new ConflictException('Ya existe un elemento con ese nombre en el destino');
            }
            throw error;
        }
    }

    private registrar(
        actual: UsuarioAutenticado,
        accion: AccionActividad,
        tipoRecurso: TipoRecurso,
        recurso: string,
        nombreRecurso: string,
        detalles?: Record<string, unknown>,
    ) {
        return this.actividadesService.registrar({
            usuario: actual.id,
            accion,
            tipoRecurso,
            recurso,
            nombreRecurso,
            detalles,
        });
    }
}