import { Types } from "mongoose";

export interface DatosNuevaCarpeta {
    nombre: string;
    propietario: string;
    carpetaPadre: Types.ObjectId | null ;
    ancestros: Types.ObjectId[];
}