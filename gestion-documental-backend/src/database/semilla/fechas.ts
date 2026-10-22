import { Model, Types, mongo } from 'mongoose';
import { ActividadDocument } from '../../acciones/entities/actividad.entity';
import { ArchivoDocument } from '../../archivos/entities/archivo.entity';
import { CarpetaDocument } from '../../carpetas/entities/carpeta.entity';
import { ComentarioDocument } from '../../comentarios/entities/comentario.entity';
import { ComparticionDocument } from '../../comparticiones/entities/comparticion.entity';
import { UsuarioDocument } from '../../usuarios/entities/usuario.entity';
import { Aleatorio } from './datos';

export interface Modelos {
  usuarios: Model<UsuarioDocument>;
  carpetas: Model<CarpetaDocument>;
  archivos: Model<ArchivoDocument>;
  comparticiones: Model<ComparticionDocument>;
  comentarios: Model<ComentarioDocument>;
  actividades: Model<ActividadDocument>;
}

const HORA = 60 * 60 * 1000;
const DIA = 24 * HORA;

interface Evento {
  accion: string;
  fecha: Date;
  detalles: Record<string, unknown>;
}


interface ConColeccion {
  collection: { bulkWrite(operaciones: mongo.AnyBulkWriteOperation[]): Promise<unknown> };
}

async function escribir(modelo: ConColeccion, operaciones: mongo.AnyBulkWriteOperation[]) {
  for (let i = 0; i < operaciones.length; i += 500) {
    await modelo.collection.bulkWrite(operaciones.slice(i, i + 500));
  }
}

const primera = (eventos: Evento[], acciones: string[]) =>
  eventos.find((e) => acciones.includes(e.accion))?.fecha;
const ultima = (eventos: Evento[], acciones: string[]) =>
  eventos.filter((e) => acciones.includes(e.accion)).at(-1)?.fecha;

const claveLote = (propietario: Types.ObjectId, fecha: Date) => `${propietario.toString()}|${fecha.getTime()}`;

export async function asignarFechas(
  modelos: Modelos,
  correos: Map<string, string>,
  rng: Aleatorio,
): Promise<void> {
  const ahora = Date.now();
  const inicio = ahora - 60 * DIA;
  const fin = ahora - 2 * HORA;

  // 1. Historial: mismo orden que tenía, repartido en 60 días ----
  const actividades = await modelos.actividades
    .find()
    .sort({ fecha: 1, _id: 1 })
    .select('_id accion recurso detalles')
    .lean()
    .exec();

  // Fechas al azar, ordenadas, con algo más de actividad en los días recientes
  const instantes = actividades
    .map(() => inicio + Math.pow(rng.siguiente(), 0.85) * (fin - inicio))
    .sort((a, b) => a - b);

  const eventosPorRecurso = new Map<string, Evento[]>();
  const opsActividades: mongo.AnyBulkWriteOperation[] = [];
  actividades.forEach((actividad, i) => {
    const fecha = new Date(instantes[i]);
    const clave = actividad.recurso.toString();
    const lista = eventosPorRecurso.get(clave) ?? [];
    lista.push({
      accion: actividad.accion,
      fecha,
      detalles: (actividad.detalles ?? {}) as Record<string, unknown>,
    });
    eventosPorRecurso.set(clave, lista);
    opsActividades.push({ updateOne: { filter: { _id: actividad._id }, update: { $set: { fecha } } } });
  });
  await escribir(modelos.actividades, opsActividades);

  const eventosDe = (id: Types.ObjectId) => eventosPorRecurso.get(id.toString()) ?? [];

  // 2. Archivos y carpetas
  const archivos = await modelos.archivos
    .find()
    .select('_id propietario enPapelera eliminadoPorCascada fechaEliminacion')
    .lean()
    .exec();
  const carpetas = await modelos.carpetas
    .find()
    .select('_id propietario enPapelera eliminadaPorCascada fechaEliminacion')
    .lean()
    .exec();

  const lotes = new Map<string, Date>();
  for (const a of archivos) {
    if (a.enPapelera && !a.eliminadoPorCascada && a.fechaEliminacion) {
      const fecha = ultima(eventosDe(a._id), ['ELIMINAR']);
      if (fecha) lotes.set(claveLote(a.propietario, a.fechaEliminacion), fecha);
    }
  }
  for (const c of carpetas) {
    if (c.enPapelera && !c.eliminadaPorCascada && c.fechaEliminacion) {
      const fecha = ultima(eventosDe(c._id), ['ELIMINAR']);
      if (fecha) lotes.set(claveLote(c.propietario, c.fechaEliminacion), fecha);
    }
  }

  const opsArchivos: mongo.AnyBulkWriteOperation[] = [];
  for (const a of archivos) {
    const eventos = eventosDe(a._id);
    const creado = primera(eventos, ['SUBIR']);
    if (!creado) continue;
    const modificado = ultima(eventos, ['SUBIR', 'EDITAR', 'RENOMBRAR', 'MOVER']) ?? creado;
    const campos: Record<string, Date> = { createdAt: creado, updatedAt: modificado };
    if (a.enPapelera && a.fechaEliminacion) {
      const lote = lotes.get(claveLote(a.propietario, a.fechaEliminacion));
      if (lote) campos['fechaEliminacion'] = lote;
    }
    opsArchivos.push({ updateOne: { filter: { _id: a._id }, update: { $set: campos } } });
  }
  await escribir(modelos.archivos, opsArchivos);

  const opsCarpetas: mongo.AnyBulkWriteOperation[] = [];
  for (const c of carpetas) {
    const eventos = eventosDe(c._id);
    const creada = primera(eventos, ['CREAR']);
    if (!creada) continue;
    const modificada = ultima(eventos, ['CREAR', 'RENOMBRAR', 'MOVER']) ?? creada;
    const campos: Record<string, Date> = { createdAt: creada, updatedAt: modificada };
    if (c.enPapelera && c.fechaEliminacion) {
      const lote = lotes.get(claveLote(c.propietario, c.fechaEliminacion));
      if (lote) campos['fechaEliminacion'] = lote;
    }
    opsCarpetas.push({ updateOne: { filter: { _id: c._id }, update: { $set: campos } } });
  }
  await escribir(modelos.carpetas, opsCarpetas);

  // 3. Comparticiones: la fecha del evento COMPARTIR de esa persona 
  const comparticiones = await modelos.comparticiones.find().select('_id recurso destinatario').lean().exec();
  const opsComparticiones: mongo.AnyBulkWriteOperation[] = [];
  for (const c of comparticiones) {
    const correo = correos.get(c.destinatario.toString());
    const delDestinatario = eventosDe(c.recurso).filter((e) => e.detalles['destinatario'] === correo);
    const creada = delDestinatario.find((e) => e.accion === 'COMPARTIR')?.fecha;
    if (!creada) continue;
    const modificada = ultima(delDestinatario, ['MODIFICAR_PERMISO']) ?? creada;
    opsComparticiones.push({
      updateOne: { filter: { _id: c._id }, update: { $set: { createdAt: creada, updatedAt: modificada } } },
    });
  }
  await escribir(modelos.comparticiones, opsComparticiones);

  // 4. Comentarios: el n-ésimo comentario de un archivo corresponde a su n-ésimo evento COMENTAR
  const comentarios = await modelos.comentarios.find().sort({ _id: 1 }).select('_id archivo').lean().exec();
  const vistos = new Map<string, number>();
  const opsComentarios: mongo.AnyBulkWriteOperation[] = [];
  for (const c of comentarios) {
    const clave = c.archivo.toString();
    const numero = vistos.get(clave) ?? 0;
    vistos.set(clave, numero + 1);
    const fecha = eventosDe(c.archivo).filter((e) => e.accion === 'COMENTAR')[numero]?.fecha;
    if (fecha) {
      opsComentarios.push({
        updateOne: { filter: { _id: c._id }, update: { $set: { createdAt: fecha, updatedAt: fecha } } },
      });
    }
  }
  await escribir(modelos.comentarios, opsComentarios);

  // 5. Usuarios: dadas de alta antes de todo lo demás ----
  const usuarios = await modelos.usuarios.find().sort({ _id: 1 }).select('_id activo').lean().exec();
  const opsUsuarios: mongo.AnyBulkWriteOperation[] = usuarios.map((u, i) => {
    const alta = new Date(inicio - 7 * DIA + i * HORA);
    const modificado = u.activo ? alta : new Date(ahora - 5 * DIA); // el inactivo se desactivó hace unos días
    return { updateOne: { filter: { _id: u._id }, update: { $set: { createdAt: alta, updatedAt: modificado } } } };
  });
  await escribir(modelos.usuarios, opsUsuarios);
}