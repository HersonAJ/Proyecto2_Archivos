import { RolUsuario } from "../../common/enums/rol-usuario.enum";

export function crearAleatorio(semilla: number) {
  let estado = semilla >>> 0;
  const siguiente = (): number => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    siguiente,
    entero: (min: number, max: number): number => min + Math.floor(siguiente() * (max - min + 1)),
    elegir: <T>(lista: readonly T[]): T => lista[Math.floor(siguiente() * lista.length)],
    mezclar: <T>(lista: readonly T[]): T[] => {
      const copia = [...lista];
      for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(siguiente() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]];
      }
      return copia;
    },
  };
}
export type Aleatorio = ReturnType<typeof crearAleatorio>;

// Usuarios
export interface UsuarioSemilla {
  clave: string;
  nombre: string;
  correo: string;
  password: string;
  rol: RolUsuario;
}

export const USUARIOS: UsuarioSemilla[] = [
  { clave: 'admin', nombre: 'Administrador', correo: 'admin@correo.com', password: 'admin123', rol: RolUsuario.ADMIN },
  { clave: 'ana', nombre: 'Ana López', correo: 'ana@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
  { clave: 'luis', nombre: 'Luis Pérez', correo: 'luis@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
  { clave: 'marta', nombre: 'Marta Gómez', correo: 'marta@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
  { clave: 'carlos', nombre: 'Carlos Ramírez', correo: 'carlos@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
  { clave: 'sofia', nombre: 'Sofía Herrera', correo: 'sofia@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
  // Este usuario se desactiva al final: conserva sus archivos y su historial
  { clave: 'pedro', nombre: 'Pedro Castillo', correo: 'pedro@correo.com', password: 'secreto123', rol: RolUsuario.USUARIO },
];

// Usuarios que reciben y comparten recursos (el administrador solo administra)
export const USUARIOS_NORMALES = ['ana', 'luis', 'marta', 'carlos', 'sofia', 'pedro'];

// Carpetas por usuario
export const CARPETAS: Record<string, string[]> = {
  ana: ['Contratos', 'Contratos/2025', 'Contratos/2026', 'Informes', 'Informes/Mensuales', 'Propuestas'],
  luis: ['Proyectos', 'Proyectos/Alfa', 'Proyectos/Beta', 'Actas'],
  marta: ['Recursos Humanos', 'Recursos Humanos/Politicas', 'Finanzas', 'Finanzas/Presupuestos'],
  carlos: ['Legal', 'Legal/Convenios', 'Manuales'],
  sofia: ['Marketing', 'Marketing/Campanas'],
  pedro: ['Archivo', 'Archivo/Antiguo'],
  admin: ['Administracion'],
};

export const rutasDe = (clave: string): string[] => CARPETAS[clave] ?? [];

const ARCHIVOS_POR_USUARIO: Record<string, number> = {
  ana: 18,
  luis: 14,
  marta: 11,
  carlos: 9,
  sofia: 7,
  pedro: 3,
  admin: 2,
};

// Contenido de los archivos
const TIPOS_DOCUMENTO = [
  'contrato', 'informe', 'acta', 'propuesta', 'minuta', 'manual',
  'politica', 'reporte', 'presupuesto', 'cronograma', 'convenio', 'memorando',
];
const CLIENTES = ['alfa', 'beta', 'gamma', 'delta', 'omega', 'sigma', 'vega', 'orion', 'atlas', 'nova'];

export const ETIQUETAS = [
  'contrato', '2025', '2026', 'borrador', 'final', 'urgente',
  'legal', 'finanzas', 'rrhh', 'marketing', 'proyecto', 'revisado',
];

const FRASES = [
  'El presente documento resume los acuerdos alcanzados entre las partes.',
  'Se revisaron los avances del trimestre y se priorizaron las tareas pendientes.',
  'El equipo confirmó que los entregables cumplen con los requisitos establecidos.',
  'Queda pendiente la validación de las cifras por parte del área financiera.',
  'Se recomienda actualizar el cronograma antes de la próxima reunión de seguimiento.',
  'Las observaciones del cliente fueron incorporadas en la versión más reciente.',
  'El presupuesto aprobado contempla los costos de operación y de soporte.',
  'Cada responsable deberá reportar su avance dentro de los plazos acordados.',
  'Se identificaron riesgos menores que serán monitoreados durante el proyecto.',
  'La documentación técnica se encuentra disponible para todo el personal autorizado.',
  'Los resultados del periodo superaron las metas fijadas al inicio del año.',
  'Se solicita la revisión final antes de enviar el documento a la dirección.',
];

export const COMENTARIOS = [
  'Revisado, todo en orden.',
  'Falta confirmar las cifras del segundo trimestre.',
  '¿Podemos agendar una reunión para discutir este punto?',
  'Excelente avance, gracias por compartirlo.',
  'Pendiente de aprobación por la dirección.',
  'Corregí algunos errores de redacción en la sección final.',
  'Necesitamos la versión firmada antes del viernes.',
  'De acuerdo con lo propuesto, sigamos adelante.',
  'Este documento reemplaza a la versión anterior.',
  'Por favor, revisen el apartado de costos.',
];

export const extensionDe = (nombre: string): 'txt' | 'md' => (nombre.endsWith('.md') ? 'md' : 'txt');

export function generarContenido(rng: Aleatorio, nombre: string, extension: 'txt' | 'md'): string {
  const titulo = nombre.replace(/\.(txt|md)$/, '').replace(/-/g, ' ');
  const partes: string[] =
    extension === 'md' ? [`# ${titulo}`, ''] : [titulo.toUpperCase(), '='.repeat(titulo.length), ''];

  // Tamaños variados: la mayoría de unos pocos KB y algunos archivos grandes (~60 KB)
  const parrafos = rng.siguiente() < 0.06 ? rng.entero(120, 200) : rng.entero(1, 30);
  for (let i = 0; i < parrafos; i++) {
    const frases = Array.from({ length: rng.entero(2, 5) }, () => rng.elegir(FRASES));
    partes.push(frases.join(' '), '');
    if (extension === 'md' && rng.siguiente() < 0.3) {
      partes.push(`- ${rng.elegir(FRASES)}`, `- ${rng.elegir(FRASES)}`, '');
    }
  }
  return partes.join('\n');
}

export interface ArchivoSemilla {
  propietario: string;
  carpeta: string | null;
  nombre: string;
  etiquetas: string[];
  contenido: string;
}

export function generarArchivos(rng: Aleatorio): ArchivoSemilla[] {
  const resultado: ArchivoSemilla[] = [];
  const usados = new Set<string>();

  for (const [propietario, cantidad] of Object.entries(ARCHIVOS_POR_USUARIO)) {
    const ubicaciones: (string | null)[] = [null, ...rutasDe(propietario)];

    for (let i = 0; i < cantidad; i++) {
      const carpeta = rng.elegir(ubicaciones);
      const extension = rng.siguiente() < 0.6 ? 'txt' : 'md';
      const base = `${rng.elegir(TIPOS_DOCUMENTO)}-${rng.elegir(CLIENTES)}`;
      let nombre = `${base}.${extension}`;
      let sufijo = 1;
      while (usados.has(`${propietario}|${carpeta}|${nombre}`)) {
        nombre = `${base}-${sufijo++}.${extension}`;
      }
      usados.add(`${propietario}|${carpeta}|${nombre}`);

      resultado.push({
        propietario,
        carpeta,
        nombre,
        etiquetas: rng.mezclar(ETIQUETAS).slice(0, rng.entero(0, 3)),
        contenido: generarContenido(rng, nombre, extension),
      });
    }
  }
  return resultado;
}