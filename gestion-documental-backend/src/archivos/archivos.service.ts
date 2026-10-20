import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUtf8 } from 'node:buffer';
import { basename, extname } from 'node:path';
import { AccesoService } from '../acceso/acceso.service';
import { ActividadesService } from '../acciones/actividades.service';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { CarpetaService } from '../carpetas/carpeta.service';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { NivelAcceso, NivelPermiso } from '../common/enums/nivel-permiso.enum';
import { TipoArchivo } from '../common/enums/tipo-archivo.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { ListarArchivosDto } from './dto/listar-archivos.dto';
import { MoverArchivoDto } from './dto/mover-archivo.dto';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
import { ArchivoDocument } from './entities/archivo.entity';
import { ArchivosRepository } from './repository/archivos.repository';
import { ContenidosRepository } from './repository/contenidos.repository';

const TIPOS_POR_EXTENSION: Record<string, TipoArchivo | undefined> = {
  '.txt': TipoArchivo.TXT,
  '.md': TipoArchivo.MD,
};

@Injectable()
export class ArchivosService {
  constructor(
    private readonly archivosRepository: ArchivosRepository,
    private readonly contenidosRepository: ContenidosRepository,
    private readonly carpetaService: CarpetaService,
    private readonly usuariosService: UsuariosService,
    private readonly actividadesService: ActividadesService,
    private readonly accesoService: AccesoService,
  ) {}

  async subir(
    archivo: Express.Multer.File | undefined,
    dto: SubirArchivoDto,
    actual: UsuarioAutenticado,
  ) {
    if (!archivo) {
      throw new BadRequestException('Debes enviar un archivo en el campo "archivo"');
    }
    const nombre = this.nombreDesdeSubida(archivo.originalname);
    const tipo = this.tipoDesdeNombre(nombre);
    this.validarTexto(archivo.buffer);
    const etiquetas = this.normalizarEtiquetas(dto.etiquetas);
    const carpeta = dto.carpeta
      ? await this.carpetaService.buscarActivaDelUsuario(dto.carpeta, actual.id)
      : null;

    const contenidoId = await this.contenidosRepository.guardar(archivo.buffer, nombre);

    //Crear el documento con los datos. Si falla, se borra el contenido para no dejar huerfanos.
    let creado;
    try {
      creado = await this.archivosRepository.crear({
        nombre,
        tipo,
        tamano: archivo.size,
        propietario: actual.id,
        carpeta: carpeta?._id ?? null,
        contenidoId,
        etiquetas,
      });
    } catch (error) {
      await this.contenidosRepository.eliminar(contenidoId).catch(() => undefined);
      this.lanzarSiNombreRepetido(error);
      throw error;
    }

    await this.usuariosService.ajustarAlmacenamiento(actual.id, creado.tamano);
    await this.actividadesService.registrar({
      usuario: actual.id,
      accion: AccionActividad.SUBIR,
      tipoRecurso: TipoRecurso.ARCHIVO,
      recurso: creado.id,
      nombreRecurso: creado.nombre,
      detalles: { tamano: creado.tamano, carpeta: carpeta?.id ?? null },
    });
    return creado;
  }

  async listar(filtros: ListarArchivosDto, actual: UsuarioAutenticado) {
    const { pagina, limite, orden, sentido, ...criterios } = filtros;

    const hayFiltros = Boolean(
      criterios.q || criterios.tipo || criterios.etiqueta || criterios.desde || criterios.hasta,
    );

    let propietario = actual.id;
    let nivelBase: NivelAcceso = 'PROPIETARIO';
    let carpeta: string | null | undefined;

    if (criterios.carpeta) {
      const acceso = await this.accesoService.exigirCarpeta(
        actual.id,
        criterios.carpeta,
        NivelPermiso.LECTURA,
      );
      propietario = acceso.propietarioId;
      nivelBase = acceso.nivel;
      carpeta = criterios.carpeta;
    } else {
      carpeta = hayFiltros ? undefined : null;
    }

    const { datos, total } = await this.archivosRepository.buscar(
      { ...criterios, propietario, carpeta },
      { campo: orden, sentido },
      pagina,
      limite,
    );

    const directos =
      nivelBase === 'PROPIETARIO'
        ? new Map<string, NivelPermiso>()
        : await this.accesoService.nivelesDirectos(actual.id, datos.map((a) => a._id));

    return {
      datos: datos.map((a) =>
        this.conNivel(a, this.accesoService.mayor(nivelBase, directos.get(a.id))),
      ),
      total,
      pagina,
      limite,
    };
  }

  async obtener(id: string, actual: UsuarioAutenticado) {
    const acceso = await this.accesoService.exigirArchivo(actual.id, id, NivelPermiso.LECTURA);
    const archivo = await this.archivosRepository.buscarActivoPorId(id);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    return this.conNivel(archivo, acceso.nivel);
  }

  async abrirContenido(id: string, actual: UsuarioAutenticado, descargar: boolean) {
    const acceso = await this.accesoService.exigirArchivo(actual.id, id, NivelPermiso.LECTURA);
    const archivo = await this.archivosRepository.buscarActivoPorId(id);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    const flujo = this.contenidosRepository.abrirLectura(archivo.contenidoId.toString());

    if (descargar) {
      await this.actividadesService.registrar({
        usuario: actual.id,
        propietarioRecurso: acceso.propietarioId, // el dueño vera quien descargo su archivo
        accion: AccionActividad.DESCARGAR,
        tipoRecurso: TipoRecurso.ARCHIVO,
        recurso: archivo.id,
        nombreRecurso: archivo.nombre,
        detalles: { tamano: archivo.tamano },
      });
    }
    return { archivo, flujo };
  }

  async actualizar(id: string, dto: ActualizarArchivoDto, actual: UsuarioAutenticado) {
    if (dto.nombre === undefined && dto.etiquetas === undefined) {
      throw new BadRequestException('Envía un nombre o etiquetas para actualizar');
    }
    const acceso = await this.accesoService.exigirArchivo(actual.id, id, NivelPermiso.EDICION);
    const archivo = await this.archivosRepository.buscarActivoPorId(id);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');

    const cambios: { nombre?: string; tipo?: TipoArchivo; etiquetas?: string[] } = {};
    if (dto.nombre !== undefined && dto.nombre !== archivo.nombre) {
      cambios.nombre = dto.nombre;
      cambios.tipo = this.tipoDesdeNombre(dto.nombre);
    }
    if (dto.etiquetas !== undefined) {
      cambios.etiquetas = this.normalizarEtiquetas(dto.etiquetas);
    }
    if (Object.keys(cambios).length === 0) return this.conNivel(archivo, acceso.nivel);

    const actualizado = await this.conNombreUnico(() =>
      this.archivosRepository.actualizar(archivo.id, cambios),
    );
    if (!actualizado) throw new NotFoundException('Archivo no encontrado');

    if (cambios.nombre) {
      await this.actividadesService.registrar({
        usuario: actual.id,
        propietarioRecurso: acceso.propietarioId,
        accion: AccionActividad.RENOMBRAR,
        tipoRecurso: TipoRecurso.ARCHIVO,
        recurso: archivo.id,
        nombreRecurso: cambios.nombre,
        detalles: { anterior: archivo.nombre, nuevo: cambios.nombre },
      });
    }
    return this.conNivel(actualizado, acceso.nivel);
  }

  async mover(id: string, dto: MoverArchivoDto, actual: UsuarioAutenticado) {
    const archivo = await this.obtenerActivo(id, actual.id);
    const destino = dto.carpeta
      ? await this.carpetaService.buscarActivaDelUsuario(dto.carpeta, actual.id)
      : null;

    const desde = archivo.carpeta?.toString() ?? null;
    const hasta = destino?.id ?? null;
    if (desde === hasta) {
      throw new BadRequestException('El archivo ya está en esa ubicación');
    }

    const movido = await this.conNombreUnico(() =>
      this.archivosRepository.actualizar(archivo.id, { carpeta: destino?._id ?? null }),
    );
    if (!movido) throw new NotFoundException('Archivo no encontrado');

    await this.actividadesService.registrar({
      usuario: actual.id,
      accion: AccionActividad.MOVER,
      tipoRecurso: TipoRecurso.ARCHIVO,
      recurso: archivo.id,
      nombreRecurso: archivo.nombre,
      detalles: { desde, hasta },
    });
    return movido;
  }

  private async obtenerActivo(id: string, usuarioId: string) {
    const archivo = await this.archivosRepository.buscarActivo(id, usuarioId);
    if (archivo) return archivo;
    await this.accesoService.exigirArchivo(usuarioId, id, 'PROPIETARIO');
    throw new NotFoundException('Archivo no encontrado');
  }

  private conNivel(archivo: ArchivoDocument, nivel: NivelAcceso) {
    return { ...archivo.toJSON(), nivel };
  }

  private nombreDesdeSubida(originalname: string): string {
    const corregido = Buffer.from(originalname, 'latin1').toString('utf8');
    const nombre = corregido.includes('\uFFFD') ? originalname : corregido;
    return basename(nombre).trim();
  }

  private tipoDesdeNombre(nombre: string): TipoArchivo {
    if (nombre.length > 255) {
      throw new BadRequestException('El nombre es demasiado largo (máximo 255 caracteres)');
    }
    const tipo = TIPOS_POR_EXTENSION[extname(nombre).toLowerCase()];
    if (!tipo) {
      throw new BadRequestException('Solo se permiten archivos .txt y .md con un nombre válido');
    }
    return tipo;
  }

  private validarTexto(contenido: Buffer) {
    if (contenido.includes(0) || !isUtf8(contenido)) {
      throw new BadRequestException('El archivo no contiene texto válido (UTF-8)');
    }
  }

  private normalizarEtiquetas(entrada?: string | string[]): string[] {
    const lista = Array.isArray(entrada) ? entrada : (entrada ?? '').split(',');
    const etiquetas = [
      ...new Set(lista.map((e) => e.trim().toLowerCase()).filter((e) => e.length > 0)),
    ];
    if (etiquetas.length > 10 || etiquetas.some((e) => e.length > 30)) {
      throw new BadRequestException('Máximo 10 etiquetas de hasta 30 caracteres cada una');
    }
    return etiquetas;
  }

  private async conNombreUnico<T>(operacion: () => Promise<T>): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      this.lanzarSiNombreRepetido(error);
      throw error;
    }
  }

  private lanzarSiNombreRepetido(error: unknown) {
    if (esClaveDuplicada(error)) {
      throw new ConflictException('Ya existe un archivo con ese nombre en esta ubicación');
    }
  }
}