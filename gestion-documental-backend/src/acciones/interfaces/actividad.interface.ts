import { AccionActividad } from "../../common/enums/accion-actividad.enum";
import { TipoRecurso } from "../../common/enums/tipo-recurso.enum";

export interface DatosActividad {
    usuario: string;
    accion: AccionActividad;
    tipoRecurso: TipoRecurso;
    recurso: string;
    nombreRecurso: string;
    detalles?: Record<string, unknown>;
}

export interface FiltroActividades {
    usuario?: string;
    accion?: AccionActividad;
    tipoRecurso?: TipoRecurso;
    recurso?: string;
    desde?: Date;
    hasta?: Date;
}