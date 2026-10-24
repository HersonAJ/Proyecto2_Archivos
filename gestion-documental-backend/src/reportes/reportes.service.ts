import { Injectable } from '@nestjs/common';
import { ReportesRepository } from './repository/reportes.repository';
import { ForbiddenException } from '@nestjs/common';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { ComparticionesRepository } from '../comparticiones/repository/comparticiones.repository';
import { Types } from 'mongoose';
import { ActividadesRepository } from '../acciones/repository/actividades.repository';
import { ReporteHistorialDto } from './dto/reporte-historial.dto';
import { ReporteFechasDto } from './dto/reporte-fechas.dto';
import { ReporteTopDto } from './dto/reporte-top.dto';

@Injectable()
export class ReportesService {
  constructor(
    private readonly reportesRepository: ReportesRepository,
    private readonly comparticionesRepository: ComparticionesRepository,
    private readonly actividadesRepository: ActividadesRepository
  ) { }

  //reporte 10
  async operacionesPorTipo() {
    const filas = await this.reportesRepository.operacionesPorTipo();
    return filas.map((fila) => ({ accion: fila._id, total: fila.total }));
  }

  //reporte 1
  async archivosPorTipo() {
    const filas = await this.reportesRepository.archivosPorTipo();
    return filas.map((fila) => ({ tipo: fila._id, total: fila.total }));
  }

  //reporte 7
  async comparticionesOtorgadas(dto: { usuarioId?: string }, actual: UsuarioAutenticado) {
    const usuarioId = dto.usuarioId ?? actual.id;
    if (actual.rol !== RolUsuario.ADMIN && usuarioId !== actual.id) {
      throw new ForbiddenException('Solo se puede consultar tus propios recursos compartidos');
    }

    const comparticiones = await this.reportesRepository.comparticionesOtorgadas(usuarioId, 500);
    const recursos = await this.recursosDe(comparticiones);

    return comparticiones.flatMap((c) => {
      const recurso = recursos.get(c.recurso.toString());
      if (!recurso) return [];
      return [
        {
          _id: c._id.toString(),
          tipoRecurso: c.tipoRecurso,
          recurso,
          destinatario: {
            _id: c.destinatario._id.toString(),
            nombre: c.destinatario.nombre,
            correo: c.destinatario.correo,
          },
          nivel: c.nivel,
          compartidoEn: c.compartidoEn,
        },
      ];
    });
  }

  // Reporte 8
  async comparticionesRecibidas(dto: { usuarioId?: string }, actual: UsuarioAutenticado) {
    const usuarioId = dto.usuarioId ?? actual.id;
    if (actual.rol !== RolUsuario.ADMIN && usuarioId !== actual.id) {
      throw new ForbiddenException('Solo puedes consultar tus propios recursos recibidos');
    }

    const comparticiones = await this.reportesRepository.comparticionesRecibidas(usuarioId, 500);
    const recursos = await this.recursosDe(comparticiones);

    return comparticiones.flatMap((c) => {
      const recurso = recursos.get(c.recurso.toString());
      if (!recurso) return [];
      return [
        {
          _id: c._id.toString(),
          tipoRecurso: c.tipoRecurso,
          recurso,
          propietario: {
            _id: c.propietario._id.toString(),
            nombre: c.propietario.nombre,
            correo: c.propietario.correo,
          },
          nivel: c.nivel,
          compartidoEn: c.compartidoEn,
        },
      ];
    });
  }

  async historialActividades(dto: ReporteHistorialDto, actual: UsuarioAutenticado) {
    const usuarioId = dto.usuarioId ?? actual.id;
    if (actual.rol !== RolUsuario.ADMIN && usuarioId !== actual.id) {
      throw new ForbiddenException('Solo puedes consultar tu propio historial');
    }

    const { datos, total } = await this.actividadesRepository.buscar(
      {
        usuario: usuarioId,
        desde: dto.desde,
        hasta: dto.hasta,
      },
      dto.pagina,
      dto.limite,
    );

    return { datos, total, pagina: dto.pagina, limite: dto.limite };
  }

  async archivosPorFecha(dto: ReporteFechasDto) {
    const { datos, total } = await this.reportesRepository.archivosPorFecha(
      dto.desde,
      dto.hasta,
      dto.pagina,
      dto.limite,
    );
    return { datos, total, pagina: dto.pagina, limite: dto.limite };
  }

  private async recursosDe(
    comparticiones: { tipoRecurso: string; recurso: Types.ObjectId }[],
  ): Promise<Map<string, { _id: string; nombre: string; tipo?: string; tamano?: number }>> {
    const idsCarpetas = comparticiones
      .filter((c) => c.tipoRecurso === TipoRecurso.CARPETA)
      .map((c) => c.recurso);
    const idsArchivos = comparticiones
      .filter((c) => c.tipoRecurso === TipoRecurso.ARCHIVO)
      .map((c) => c.recurso);

    const [carpetas, archivos] = await Promise.all([
      this.comparticionesRepository.carpetasActivasPorIds(idsCarpetas),
      this.comparticionesRepository.archivosActivosPorIds(idsArchivos),
    ]);

    const mapa = new Map<string, { _id: string; nombre: string; tipo?: string; tamano?: number }>();
    carpetas.forEach((c) => mapa.set(c._id.toString(), { _id: c._id.toString(), nombre: c.nombre }));
    archivos.forEach((a) => mapa.set(a._id.toString(), {
      _id: a._id.toString(),
      nombre: a.nombre,
      tipo: a.tipo,
      tamano: a.tamano,
    }),
    );
    return mapa;
  }

  async archivosConMasOperaciones(dto: ReporteTopDto) {
    const filas = await this.reportesRepository.archivosConMasOperaciones(dto.limite);
    return filas.map((f) => ({
      _id: f._id.toString(),
      nombre: f.archivo.nombre,
      tipo: f.archivo.tipo,
      tamano: f.archivo.tamano,
      propietario: f.archivo.propietario.toString(),
      total: f.total
    }));
  }

  async archivosNuncaCompartidos(dto: ReporteFechasDto) {
    const { datos, total } = await this.reportesRepository.archivosNuncaCompartidos(
      dto.pagina,
      dto.limite,
    );
    return { datos, total, pagina: dto.pagina, limite: dto.limite };
  }

  async carpetasConMasArchivos(dto: ReporteTopDto) {
    const filas = await this.reportesRepository.carpetasConMasArchivos(dto.limite);
    return filas.map((f) => ({
      _id: f._id.toString(),
      nombre: f.carpeta.nombre,
      propietario: f.carpeta.propietario.toString(),
      total: f.total,
    }));
  }

  async usuariosConMasArchivos(dto: ReporteTopDto) {
    const filas = await this.reportesRepository.usuariosConMasArchivos(dto.limite);
    return filas.map((f) => ({
      _id: f._id.toString(),
      nombre: f.usuario.nombre,
      correo: f.usuario.correo,
      total: f.total,
    }));
  }
}