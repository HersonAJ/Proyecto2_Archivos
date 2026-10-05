import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { isUtf8 } from 'node:buffer';
import { basename, extname } from 'node:path';
import { ActividadesService } from '../acciones/actividades.service';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { CarpetaService } from '../carpetas/carpeta.service';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { TipoArchivo } from '../common/enums/tipo-archivo.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';
import { UsuariosService } from '../usuarios/usuarios.service';
import { ActualizarArchivoDto } from './dto/actualizar-archivo.dto';
import { ListarArchivosDto } from './dto/listar-archivos.dto';
import { MoverArchivoDto } from './dto/mover-archivo.dto';
import { SubirArchivoDto } from './dto/subir-archivo.dto';
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
  ) {}

  async subir(
    archivo: Express.Multer.File | undefined,
    dto: SubirArchivoDto,
    actual: UsuarioAutenticado,
  ) {
    // 1 Validar todo ANTES de escribir
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

    // 2 Guardar el contenido en GridFS
    const contenidoId = await this.contenidosRepository.guardar(archivo.buffer, nombre);

    // 3. Crear el documento con los datos. Si falla, se borra el contenido para no dejar huerfanos.
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

    // 4. Actualizar el espacio usado y registrar en el historial
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
    let carpeta: string | null | undefined;
    if (criterios.carpeta) {
      await this.carpetaService.buscarActivaDelUsuario(criterios.carpeta, actual.id);
      carpeta = criterios.carpeta;
    } else {
      carpeta = hayFiltros ? undefined : null;
    }

    const { datos, total } = await this.archivosRepository.buscar(
      { ...criterios, propietario: actual.id, carpeta },
      { campo: orden, sentido },
      pagina,
      limite,
    );
    return { datos, total, pagina, limite };
  }

  obtener(id: string, actual: UsuarioAutenticado) {
    return this.obtenerActivo(id, actual.id);
  }

  async abrirContenido(id: string, actual: UsuarioAutenticado, descargar: boolean) {
    const archivo = await this.obtenerActivo(id, actual.id);
    const flujo = this.contenidosRepository.abrirLectura(archivo.contenidoId.toString());

    if (descargar) {
      await this.actividadesService.registrar({
        usuario: actual.id,
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
    const archivo = await this.obtenerActivo(id, actual.id);

    const cambios: { nombre?: string; tipo?: TipoArchivo; etiquetas?: string[] } = {};
    if (dto.nombre !== undefined && dto.nombre !== archivo.nombre) {
      cambios.nombre = dto.nombre;
      cambios.tipo = this.tipoDesdeNombre(dto.nombre);
    }
    if (dto.etiquetas !== undefined) {
      cambios.etiquetas = this.normalizarEtiquetas(dto.etiquetas);
    }
    if (Object.keys(cambios).length === 0) return archivo;

    const actualizado = await this.conNombreUnico(() =>
      this.archivosRepository.actualizar(archivo.id, cambios),
    );
    if (!actualizado) throw new NotFoundException('Archivo no encontrado');

    if (cambios.nombre) {
      await this.actividadesService.registrar({
        usuario: actual.id,
        accion: AccionActividad.RENOMBRAR,
        tipoRecurso: TipoRecurso.ARCHIVO,
        recurso: archivo.id,
        nombreRecurso: cambios.nombre,
        detalles: { anterior: archivo.nombre, nuevo: cambios.nombre },
      });
    }
    return actualizado;
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

  private async obtenerActivo(id: string, propietario: string) {
    const archivo = await this.archivosRepository.buscarActivo(id, propietario);
    if (!archivo) throw new NotFoundException('Archivo no encontrado');
    return archivo;
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

  // Traduce el error del indice unico de Mongo (código 11000) a un 409
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