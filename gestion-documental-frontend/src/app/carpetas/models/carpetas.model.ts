export interface Carpeta {
  _id: string;
  nombre: string;
  propietario: string;
  carpetaPadre: string | null; // null = esta en la raiz
  ancestros: string[];
  enPapelera: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface RutaCarpeta {
  _id: string;
  nombre: string;
}

export interface DetalleCarpeta {
  carpeta: Carpeta;
  ruta: RutaCarpeta[];
}

export interface CrearCarpeta {
  nombre: string;
  carpetaPadre?: string;
}