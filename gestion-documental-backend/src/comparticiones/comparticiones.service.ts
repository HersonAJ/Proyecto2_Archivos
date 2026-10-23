import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Types } from 'mongoose';
import { ActividadesService } from '../acciones/actividades.service';
import { AccesoService } from '../acceso/acceso.service';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { esClaveDuplicada } from '../common/utils/errores-mongo.util';
import { UsuariosService } from '../usuarios/usuarios.service';
import { CambiarNivelDto } from './dto/cambiar-nivel.dto';
import { CompartirDto } from './dto/compartir.dto';
import { ConsultaRecursoDto } from './dto/consulta-recurso.dto';
import { RecursoResumen } from './interfaces/comparticiones.interface';
import { ComparticionesRepository } from './repository/comparticiones.repository';

const LIMITE_LISTA = 500; 

@Injectable()
export class ComparticionesService {

  constructor(
    private readonly comparticionesRepository: ComparticionesRepository,
    private readonly accesoService: AccesoService,
    private readonly usuariosService: UsuariosService,
    private readonly actividadesService: ActividadesService,
  ) {}

  async compartir(dto: CompartirDto, actual: UsuarioAutenticado) {
    const recurso = await this.exigirPropietario(dto.tipoRecurso, dto.recurso, actual);

    const destinatario = await this.usuariosService.buscarActivoPorCorreo(dto.correo);
    if (!destinatario) {
      throw new NotFoundException('No existe un usuario activo con ese correo');
    }
    if (destinatario.id === actual.id) {
      throw new BadRequestException('No puedes compartir un recurso contigo mismo');
    }

    let creada;
    try {
      creada = await this.comparticionesRepository.crear({
        tipoRecurso: dto.tipoRecurso,
        recurso: dto.recurso,
        propietario: actual.id,
        destinatario: destinatario.id,
        nivel: dto.nivel,
      });
    } catch (error) {
      if (esClaveDuplicada(error)) {
        throw new ConflictException('Ya compartiste este recurso con esa persona');
      }
      throw error;
    }

    await this.registrar(actual, AccionActividad.COMPARTIR, dto.tipoRecurso, dto.recurso, recurso.nombre, {
      destinatario: destinatario.correo,
      nivel: dto.nivel,
    });
    return creada;
  }

  async quienTieneAcceso(consulta: ConsultaRecursoDto, actual: UsuarioAutenticado) {
    await this.exigirPropietario(consulta.tipoRecurso, consulta.recurso, actual);
    return this.comparticionesRepository.deRecurso(consulta.recurso);
  }

  async cambiarNivel(id: string, dto: CambiarNivelDto, actual: UsuarioAutenticado) {
    const comparticion = await this.comparticionesRepository.buscarDelPropietario(id, actual.id);
    if (!comparticion) throw new NotFoundException('Compartición no encontrada');
    if (comparticion.nivel === dto.nivel) return comparticion;

    const actualizada = await this.comparticionesRepository.cambiarNivel(id, dto.nivel);
    if (!actualizada) throw new NotFoundException('Compartición no encontrada');

    const nombre = await this.comparticionesRepository.nombreDeRecurso(
      comparticion.tipoRecurso,
      comparticion.recurso,
    );
    await this.registrar(
      actual,
      AccionActividad.MODIFICAR_PERMISO,
      comparticion.tipoRecurso,
      comparticion.recurso.toString(),
      nombre,
      {
        destinatario: comparticion.destinatario.correo,
        anterior: comparticion.nivel,
        nuevo: dto.nivel,
      },
    );
    return actualizada;
  }

  async retirar(id: string, actual: UsuarioAutenticado) {
    const comparticion = await this.comparticionesRepository.buscarDelPropietario(id, actual.id);
    if (!comparticion) throw new NotFoundException('Compartición no encontrada');

    await this.comparticionesRepository.eliminar(id);

    const nombre = await this.comparticionesRepository.nombreDeRecurso(
      comparticion.tipoRecurso,
      comparticion.recurso,
    );
    await this.registrar(
      actual,
      AccionActividad.REVOCAR_PERMISO,
      comparticion.tipoRecurso,
      comparticion.recurso.toString(),
      nombre,
      { destinatario: comparticion.destinatario.correo, nivel: comparticion.nivel },
    );
    return { retirada: true };
  }

  async recibidas(actual: UsuarioAutenticado) {
    const comparticiones = await this.comparticionesRepository.recibidas(actual.id, LIMITE_LISTA);
    const recursos = await this.recursosDe(comparticiones);

    return comparticiones.flatMap((c) => {
      const recurso = recursos.get(c.recurso.toString());
      if (!recurso) return [];
      return [
        {
          _id: c._id,
          nivel: c.nivel,
          tipoRecurso: c.tipoRecurso,
          compartidoEn: c.createdAt,
          propietario: c.propietario,
          recurso,
        },
      ];
    });
  }

  async otorgadas(actual: UsuarioAutenticado) {
    const comparticiones = await this.comparticionesRepository.otorgadas(actual.id, LIMITE_LISTA);
    const recursos = await this.recursosDe(comparticiones);

    return comparticiones.flatMap((c) => {
      const recurso = recursos.get(c.recurso.toString());
      if (!recurso) return [];
      return [
        {
          _id: c._id,
          nivel: c.nivel,
          tipoRecurso: c.tipoRecurso,
          compartidoEn: c.createdAt,
          destinatario: c.destinatario,
          recurso,
        },
      ];
    });
  }

  private exigirPropietario(tipo: TipoRecurso, id: string, actual: UsuarioAutenticado) {
    return tipo === TipoRecurso.CARPETA
      ? this.accesoService.exigirCarpeta(actual.id, id, 'PROPIETARIO')
      : this.accesoService.exigirArchivo(actual.id, id, 'PROPIETARIO');
  }

  private async recursosDe(comparticiones: { tipoRecurso: TipoRecurso; recurso: Types.ObjectId }[]) {
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

    const mapa = new Map<string, RecursoResumen>();
    carpetas.forEach((c) => mapa.set(c._id.toString(), { _id: c._id.toString(), nombre: c.nombre }));
    archivos.forEach((a) =>
      mapa.set(a._id.toString(), {
        _id: a._id.toString(),
        nombre: a.nombre,
        tipo: a.tipo,
        tamano: a.tamano,
      }),
    );
    return mapa;
  }

  private registrar(
    actual: UsuarioAutenticado,
    accion: AccionActividad,
    tipoRecurso: TipoRecurso,
    recurso: string,
    nombreRecurso: string,
    detalles: Record<string, unknown>,
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