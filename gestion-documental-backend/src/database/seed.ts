import { INestApplicationContext } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { getConnectionToken, getModelToken } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { AccesoService } from '../acceso/acceso.service';
import { ActividadesService } from '../acciones/actividades.service';
import { Actividad, ActividadDocument } from '../acciones/entities/actividad.entity';
import { AppModule } from '../app.module';
import { ArchivosService } from '../archivos/archivos.service';
import { Archivo, ArchivoDocument } from '../archivos/entities/archivo.entity';
import type { UsuarioAutenticado } from '../autenticacion/interfaces/solicitud-autenticada.interface';
import { CarpetaService } from '../carpetas/carpeta.service';
import { Carpeta, CarpetaDocument } from '../carpetas/entities/carpeta.entity';
import { ComentariosService } from '../comentarios/comentarios.service';
import { Comentario, ComentarioDocument } from '../comentarios/entities/comentario.entity';
import { AccionActividad } from '../common/enums/accion-actividad.enum';
import { NivelAcceso, NivelPermiso } from '../common/enums/nivel-permiso.enum';
import { RolUsuario } from '../common/enums/rol-usuario.enum';
import { TipoRecurso } from '../common/enums/tipo-recurso.enum';
import { ComparticionesService } from '../comparticiones/comparticiones.service';
import { Comparticion, ComparticionDocument } from '../comparticiones/entities/comparticion.entity';
import { PapeleraService } from '../papelera/papelera.service';
import { Usuario, UsuarioDocument } from '../usuarios/entities/usuario.entity';
import { UsuariosService } from '../usuarios/usuarios.service';
import {
    COMENTARIOS,
    CARPETAS,
    ETIQUETAS,
    USUARIOS,
    USUARIOS_NORMALES,
    crearAleatorio,
    extensionDe,
    generarArchivos,
    generarContenido,
    rutasDe,
} from './semilla/datos';
import { Modelos, asignarFechas } from './semilla/fechas';

// SEED_FORZAR=true (npm run seed:reset) permite borrar los datos existentes antes de sembrar
const FORZAR = process.env.SEED_FORZAR === 'true';

interface UsuarioCreado {
    id: string;
    correo: string;
    rol: RolUsuario;
}

interface ArchivoCreado {
    id: string;
    propietario: string;
    carpeta: string | null;
    nombre: string;
    tamano: number;
}

interface Acceso {
    archivo: ArchivoCreado;
    usuario: string;
    nivel: NivelAcceso;
}

function archivoSubido(nombre: string, contenido: string): Express.Multer.File {
    const buffer = Buffer.from(contenido, 'utf8');
    return { originalname: nombre, buffer, size: buffer.length } as Express.Multer.File;
}

async function sembrar(app: INestApplicationContext) {
    const usuariosService = app.get(UsuariosService);
    const carpetaService = app.get(CarpetaService);
    const archivosService = app.get(ArchivosService);
    const comparticionesService = app.get(ComparticionesService);
    const comentariosService = app.get(ComentariosService);
    const papeleraService = app.get(PapeleraService);
    const actividadesService = app.get(ActividadesService);
    const accesoService = app.get(AccesoService);

    const modelos: Modelos = {
        usuarios: app.get<Model<UsuarioDocument>>(getModelToken(Usuario.name)),
        carpetas: app.get<Model<CarpetaDocument>>(getModelToken(Carpeta.name)),
        archivos: app.get<Model<ArchivoDocument>>(getModelToken(Archivo.name)),
        comparticiones: app.get<Model<ComparticionDocument>>(getModelToken(Comparticion.name)),
        comentarios: app.get<Model<ComentarioDocument>>(getModelToken(Comentario.name)),
        actividades: app.get<Model<ActividadDocument>>(getModelToken(Actividad.name)),
    };
    const conexion = app.get<Connection>(getConnectionToken());

    // ---------- Seguridad: no pisar datos sin que se pida ----------
    const hayDatos = (await modelos.usuarios.estimatedDocumentCount()) > 0;
    if (hayDatos && !FORZAR) {
        console.error('La base de datos ya contiene datos. Para borrarlos y sembrar de nuevo ejecuta: npm run seed:reset');
        process.exitCode = 1;
        return;
    }
    if (FORZAR) {
        console.log('Borrando los datos existentes...');
        await Promise.all([
            modelos.usuarios.deleteMany({}).exec(),
            modelos.carpetas.deleteMany({}).exec(),
            modelos.archivos.deleteMany({}).exec(),
            modelos.comparticiones.deleteMany({}).exec(),
            modelos.comentarios.deleteMany({}).exec(),
            modelos.actividades.deleteMany({}).exec(),
        ]);
        // GridFS guarda el contenido de los archivos en dos colecciones propias
        if (conexion.db) {
            await conexion.db.collection('contenidos.files').deleteMany({});
            await conexion.db.collection('contenidos.chunks').deleteMany({});
        }
    }

    const rng = crearAleatorio(2026);
    const fallos: string[] = [];

    // Ejecuta una operación opcional: si falla (por ejemplo, una compartición repetida), lo anota y sigue
    const intentar = async <T>(descripcion: string, operacion: () => Promise<T>): Promise<T | undefined> => {
        try {
            return await operacion();
        } catch (error) {
            fallos.push(`${descripcion}: ${error instanceof Error ? error.message : String(error)}`);
            return undefined;
        }
    };

    // 1. Usuarios
    console.log('Creando usuarios...');
    const usuarios = new Map<string, UsuarioCreado>();
    for (const u of USUARIOS) {
        const creado = await usuariosService.create({
            nombre: u.nombre,
            correo: u.correo,
            password: u.password,
            rol: u.rol,
        });
        usuarios.set(u.clave, { id: creado.id, correo: creado.correo, rol: creado.rol });
    }
    const usuario = (clave: string): UsuarioCreado => {
        const encontrado = usuarios.get(clave);
        if (!encontrado) throw new Error(`Usuario desconocido: ${clave}`);
        return encontrado;
    };
    const actual = (clave: string): UsuarioAutenticado => ({ id: usuario(clave).id, rol: usuario(clave).rol });

    // 2. Carpetas
    console.log('Creando carpetas...');
    const carpetas = new Map<string, string>(); // "usuario|ruta" -> id
    const idCarpeta = (clave: string, ruta: string): string => {
        const id = carpetas.get(`${clave}|${ruta}`);
        if (!id) throw new Error(`Carpeta desconocida: ${clave}/${ruta}`);
        return id;
    };
    for (const [clave, rutas] of Object.entries(CARPETAS)) {
        for (const ruta of rutas) {
            const partes = ruta.split('/');
            const padre = partes.length > 1 ? idCarpeta(clave, partes.slice(0, -1).join('/')) : undefined;
            const creada = await carpetaService.crear(
                { nombre: partes[partes.length - 1], carpetaPadre: padre },
                actual(clave),
            );
            carpetas.set(`${clave}|${ruta}`, creada.id);
        }
    }

    // 3. Archivos
    console.log('Subiendo archivos...');
    const archivos: ArchivoCreado[] = [];
    for (const spec of generarArchivos(rng)) {
        const carpetaId = spec.carpeta ? idCarpeta(spec.propietario, spec.carpeta) : undefined;
        const creado = await archivosService.subir(
            archivoSubido(spec.nombre, spec.contenido),
            { carpeta: carpetaId, etiquetas: spec.etiquetas.join(', ') },
            actual(spec.propietario),
        );
        archivos.push({
            id: creado.id,
            propietario: spec.propietario,
            carpeta: carpetaId ?? null,
            nombre: creado.nombre,
            tamano: creado.tamano,
        });
    }

    // 4. Comparticiones
    console.log('Compartiendo recursos...');
    let compartidas = 0;
    const compartir = async (
        tipo: TipoRecurso,
        recurso: string,
        dueno: string,
        destinatario: string,
        nivel: NivelPermiso,
    ) => {
        const resultado = await intentar(`compartir con ${destinatario}`, () =>
            comparticionesService.compartir(
                { tipoRecurso: tipo, recurso, correo: usuario(destinatario).correo, nivel },
                actual(dueno),
            ),
        );
        if (resultado) compartidas++;
    };
    const nivelAlAzar = () =>
        rng.elegir([NivelPermiso.LECTURA, NivelPermiso.LECTURA, NivelPermiso.COMENTAR, NivelPermiso.EDICION]);

    for (const dueno of USUARIOS_NORMALES) {
        const raices = rutasDe(dueno).filter((ruta) => !ruta.includes('/'));
        for (const [i, raiz] of raices.entries()) {
            const destinatarios = rng
                .mezclar(USUARIOS_NORMALES.filter((c) => c !== dueno))
                .slice(0, i === 0 ? 2 : 1);
            for (const destinatario of destinatarios) {
                await compartir(TipoRecurso.CARPETA, idCarpeta(dueno, raiz), dueno, destinatario, nivelAlAzar());
            }
        }
    }

    const propios = archivos.filter((a) => USUARIOS_NORMALES.includes(a.propietario));
    for (const archivo of rng.mezclar(propios).slice(0, 14)) {
        const destinatarios = rng
            .mezclar(USUARIOS_NORMALES.filter((c) => c !== archivo.propietario))
            .slice(0, rng.entero(1, 2));
        for (const destinatario of destinatarios) {
            await compartir(TipoRecurso.ARCHIVO, archivo.id, archivo.propietario, destinatario, nivelAlAzar());
        }
    }

    const popular = archivos.find((a) => a.propietario === 'ana');
    if (popular) {
        const niveles = [NivelPermiso.LECTURA, NivelPermiso.COMENTAR, NivelPermiso.EDICION, NivelPermiso.LECTURA];
        for (const [i, destinatario] of ['luis', 'marta', 'carlos', 'sofia'].entries()) {
            await compartir(TipoRecurso.ARCHIVO, popular.id, 'ana', destinatario, niveles[i]);
        }
    }

    const deAna = await comparticionesService.otorgadas(actual('ana'));
    for (const c of deAna.slice(0, 2)) {
        await intentar('cambiar nivel', () =>
            comparticionesService.cambiarNivel(c._id.toString(), { nivel: NivelPermiso.EDICION }, actual('ana')),
        );
    }
    if (deAna[2]) {
        await intentar('retirar permiso', () => comparticionesService.retirar(deAna[2]._id.toString(), actual('ana')));
    }
    const deLuis = await comparticionesService.otorgadas(actual('luis'));
    if (deLuis[0]) {
        await intentar('retirar permiso', () => comparticionesService.retirar(deLuis[0]._id.toString(), actual('luis')));
    }

    // 5. Quién puede hacer qué 
    const accesos: Acceso[] = [];
    for (const archivo of archivos) {
        for (const [clave, u] of usuarios) {
            if (clave === archivo.propietario) continue;
            const acceso = await accesoService.sobreArchivo(u.id, archivo.id);
            if (acceso) accesos.push({ archivo, usuario: clave, nivel: acceso.nivel });
        }
    }

    // 6. Actividad: descargas, ediciones, renombres, comentarios, movimientos
    console.log('Generando actividad...');
    const pares = rng.mezclar([
        ...archivos.map((a) => ({ archivo: a, usuario: a.propietario })),
        ...accesos.map((a) => ({ archivo: a.archivo, usuario: a.usuario })),
    ]);
    for (let i = 0; i < 160; i++) {
        const par = pares[Math.floor(Math.pow(rng.siguiente(), 3) * pares.length)];
        await actividadesService.registrar({
            usuario: usuario(par.usuario).id,
            propietarioRecurso: usuario(par.archivo.propietario).id,
            accion: AccionActividad.DESCARGAR,
            tipoRecurso: TipoRecurso.ARCHIVO,
            recurso: par.archivo.id,
            nombreRecurso: par.archivo.nombre,
            detalles: { tamano: par.archivo.tamano },
        });
    }

    const conEdicion = accesos.filter((a) => a.nivel === NivelPermiso.EDICION);
    const ediciones = [
        ...rng.mezclar(conEdicion).slice(0, 8).map((a) => ({ archivo: a.archivo, editor: a.usuario })),
        ...rng.mezclar(archivos).slice(0, 4).map((a) => ({ archivo: a, editor: a.propietario })),
    ];
    for (const { archivo, editor } of ediciones) {
        const editado = await intentar(`editar ${archivo.nombre}`, async () => {
            const vigente = await archivosService.obtener(archivo.id, actual(editor));
            const texto = generarContenido(rng, archivo.nombre, extensionDe(archivo.nombre));
            return archivosService.editarContenido(
                archivo.id,
                archivoSubido(archivo.nombre, texto),
                { version: vigente.updatedAt },
                actual(editor),
            );
        });
        if (editado) archivo.tamano = editado.tamano;
    }

    for (const { archivo, usuario: editor } of rng.mezclar(conEdicion).slice(0, 6)) {
        const nuevo = archivo.nombre.replace(/(\.(txt|md))$/, '-rev$1');
        const hecho = await intentar(`renombrar ${archivo.nombre}`, () =>
            archivosService.actualizar(
                archivo.id,
                { nombre: nuevo, etiquetas: ['revisado', rng.elegir(ETIQUETAS)] },
                actual(editor),
            ),
        );
        if (hecho) archivo.nombre = nuevo;
    }

    const quienComenta = [
        ...archivos.map((a) => ({ archivo: a, usuario: a.propietario })),
        ...accesos
            .filter((a) => a.nivel === NivelPermiso.COMENTAR || a.nivel === NivelPermiso.EDICION)
            .map((a) => ({ archivo: a.archivo, usuario: a.usuario })),
    ];
    for (const { archivo, usuario: autor } of rng.mezclar(quienComenta).slice(0, 32)) {
        await intentar('comentar', () =>
            comentariosService.crear(archivo.id, { texto: rng.elegir(COMENTARIOS) }, actual(autor)),
        );
    }

    for (const archivo of rng.mezclar(archivos.filter((a) => a.propietario !== 'admin')).slice(0, 8)) {
        const opciones: (string | null)[] = [null, ...rutasDe(archivo.propietario).map((r) => idCarpeta(archivo.propietario, r))];
        const destino = rng.elegir(opciones.filter((id) => id !== archivo.carpeta));
        const movido = await intentar(`mover ${archivo.nombre}`, () =>
            archivosService.mover(archivo.id, { carpeta: destino }, actual(archivo.propietario)),
        );
        if (movido) archivo.carpeta = destino;
    }

    await intentar('renombrar carpeta', () =>
        carpetaService.renombrar(idCarpeta('ana', 'Propuestas'), { nombre: 'Propuestas comerciales' }, actual('ana')),
    );
    await intentar('renombrar carpeta', () =>
        carpetaService.renombrar(idCarpeta('marta', 'Finanzas'), { nombre: 'Finanzas 2026' }, actual('marta')),
    );
    await intentar('mover carpeta', () =>
        carpetaService.mover(idCarpeta('luis', 'Proyectos/Beta'), { carpetaPadre: null }, actual('luis')),
    );

    // 7. Papelera
    console.log('Usando la papelera...');
    const archivosPorCarpeta = new Map<string, number>();
    for (const a of archivos) {
        if (a.carpeta) archivosPorCarpeta.set(a.carpeta, (archivosPorCarpeta.get(a.carpeta) ?? 0) + 1);
    }
    const candidatas = USUARIOS_NORMALES.flatMap((clave) =>
        rutasDe(clave).map((ruta) => ({ clave, id: idCarpeta(clave, ruta) })),
    ).filter((c) => (archivosPorCarpeta.get(c.id) ?? 0) >= 2);

    const paraPapelera = rng.mezclar(archivos.filter((a) => a.propietario !== 'admin')).slice(0, 7);
    for (const a of paraPapelera) {
        await intentar('enviar a la papelera', () => papeleraService.enviarArchivo(a.id, actual(a.propietario)));
    }
    for (const a of paraPapelera.slice(0, 2)) {
        await intentar('restaurar', () => papeleraService.restaurarArchivo(a.id, actual(a.propietario)));
    }
    for (const a of paraPapelera.slice(2, 4)) {
        await intentar('eliminar definitivamente', () => papeleraService.eliminarArchivo(a.id, actual(a.propietario)));
    }
    if (candidatas.length > 0) {
        const carpeta = rng.elegir(candidatas);
        await intentar('enviar carpeta a la papelera', () => papeleraService.enviarCarpeta(carpeta.id, actual(carpeta.clave)));
    }

    // 8. Un usuario inactivo (conserva su información)
    await usuariosService.desactivar(usuario('pedro').id);

    // 9. Fechas repartidas en los últimos 60 días
    console.log('Repartiendo las fechas en los últimos 60 días...');
    const correos = new Map([...usuarios.values()].map((u) => [u.id, u.correo]));
    await asignarFechas(modelos, correos, rng);

    // Resumen
    const contar = (modelo: { countDocuments: (f?: object) => { exec: () => Promise<number> } }, filtro?: object) =>
        modelo.countDocuments(filtro).exec();
    const [nUsuarios, nCarpetas, nArchivos, nActivos, nPapelera, nComparticiones, nComentarios, nActividades] =
        await Promise.all([
            contar(modelos.usuarios),
            contar(modelos.carpetas),
            contar(modelos.archivos),
            contar(modelos.archivos, { enPapelera: false }),
            contar(modelos.archivos, { enPapelera: true }),
            contar(modelos.comparticiones),
            contar(modelos.comentarios),
            contar(modelos.actividades),
        ]);
    const nContenidos = (await conexion.db?.collection('contenidos.files').countDocuments()) ?? 0;
    const porAccion = await modelos.actividades
        .aggregate<{ _id: string; total: number }>([{ $group: { _id: '$accion', total: { $sum: 1 } } }, { $sort: { total: -1 } }])
        .exec();

    console.log('\n=========== RESUMEN ===========');
    console.log(`Usuarios:        ${nUsuarios}`);
    console.log(`Carpetas:        ${nCarpetas}`);
    console.log(`Archivos:        ${nArchivos} (${nActivos} activos y ${nPapelera} en la papelera)`);
    console.log(`Contenidos GridFS: ${nContenidos}`);
    console.log(`Comparticiones:  ${nComparticiones}`);
    console.log(`Comentarios:     ${nComentarios}`);
    console.log(`Actividades:     ${nActividades}`);
    console.log('Actividades por acción: ' + porAccion.map((a) => `${a._id}=${a.total}`).join(', '));

    const sumas = await modelos.archivos
        .aggregate<{ _id: Types.ObjectId; archivos: number; bytes: number }>([
            { $group: { _id: '$propietario', archivos: { $sum: 1 }, bytes: { $sum: '$tamano' } } },
        ])
        .exec();
    const registrados = await modelos.usuarios.find().select('nombre almacenamientoUsado').lean().exec();
    console.log('\nEspacio por usuario (registrado = suma de sus archivos):');
    for (const u of registrados) {
        const suma = sumas.find((s) => s._id.toString() === u._id.toString());
        const bytes = suma?.bytes ?? 0;
        const estado = bytes === u.almacenamientoUsado ? 'OK' : 'DIFERENCIA';
        console.log(`  ${u.nombre.padEnd(16)} ${String(suma?.archivos ?? 0).padStart(3)} archivos  ${u.almacenamientoUsado} B  ${estado}`);
    }

    console.log('\nCredenciales:');
    for (const u of USUARIOS) {
        console.log(`  ${u.correo.padEnd(20)} ${u.password.padEnd(12)} ${u.rol}${u.clave === 'pedro' ? ' (inactivo)' : ''}`);
    }

    if (fallos.length > 0) {
        console.log(`\nOperaciones opcionales que no se aplicaron (${fallos.length}), por ejemplo comparticiones repetidas:`);
        fallos.slice(0, 8).forEach((f) => console.log(`  - ${f}`));
    }

    const problemas: string[] = [];
    if (nUsuarios < 3) problemas.push('menos de 3 usuarios');
    if (nActivos < 50) problemas.push('menos de 50 archivos activos');
    if (nComparticiones < 20) problemas.push('menos de 20 comparticiones');
    if (nPapelera === 0) problemas.push('nada en la papelera');
    if (nActividades < 100) problemas.push('poca actividad en el historial');
    if (nContenidos !== nArchivos) problemas.push(`hay ${nContenidos} contenidos para ${nArchivos} archivos`);
    if (problemas.length > 0) {
        console.error('\nNO SE CUMPLEN LOS MÍNIMOS: ' + problemas.join('; '));
        process.exitCode = 1;
    } else {
        console.log('\nCarga inicial completa.');
    }
}

async function ejecutar() {
    const app = await NestFactory.createApplicationContext(AppModule, { logger: ['error', 'warn'] });
    try {
        await sembrar(app);
    } finally {
        await app.close();
    }
}

ejecutar().catch((error) => {
    console.error('Error al ejecutar el seed:', error);
    process.exit(1);
});