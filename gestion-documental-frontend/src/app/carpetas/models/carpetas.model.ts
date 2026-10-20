import { NivelAcceso } from "../../comparticiones/models/comparticion.model";
import { UsuarioResumen } from "../../usuarios/models/usuario.model";

export interface Carpeta {
  _id: string;
  nombre: string;
  propietario: string;
  carpetaPadre: string | null; // null = esta en la raiz
  ancestros: string[];
  enPapelera: boolean;
  createdAt: string;
  updatedAt: string;
  nivel?: NivelAcceso;
}

export interface RutaCarpeta {
  _id: string;
  nombre: string;
}

export interface DetalleCarpeta {
  carpeta: Carpeta;
  ruta: RutaCarpeta[];
  propietario: UsuarioResumen | null;
}

export interface CrearCarpeta {
  nombre: string;
  carpetaPadre?: string;
}