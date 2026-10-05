import { Types } from "mongoose";
import { OrdenArchivo, SentidoOrden } from "../../common/enums/orden.archivo.enum";
import { TipoArchivo } from "../../common/enums/tipo-archivo.enum";

export interface DatosNuevoArchivo {
    nombre: string;
    tipo: TipoArchivo;
    tamano: number;
    propietario: string;
    carpeta: Types.ObjectId | null;
    contenidoId: string;
    etiquetas: string[];
}

export interface CambiosArchivo {
    nombre?: string;
    tipo?: TipoArchivo;
    etiquetas?: string[];
    carpeta?: Types.ObjectId | null;
}

export interface FiltroArchivos {
    propietario: string;
    carpeta?: string | null;
    q?: string;
    tipo?: TipoArchivo;
    etiqueta?: string;
    desde?: Date;
    hasta?: Date;
}

export interface OrdenamientoArchivos {
    campo: OrdenArchivo;
    sentido: SentidoOrden;
}