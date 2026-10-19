// Niveles que el propietario puede conceder al compartir
export enum NivelPermiso {
  LECTURA = 'LECTURA',
  COMENTAR = 'COMENTAR',
  EDICION = 'EDICION',
}

// Lo que un usuario puede ser respecto a un recurso: uno de los niveles anteriores o su propietario
export type NivelAcceso = NivelPermiso | 'PROPIETARIO';

// Para comparar niveles: a mayor numero, mas permisos
export const RANGO_NIVEL: Record<NivelAcceso, number> = {
  LECTURA: 1,
  COMENTAR: 2,
  EDICION: 3,
  PROPIETARIO: 4,
};