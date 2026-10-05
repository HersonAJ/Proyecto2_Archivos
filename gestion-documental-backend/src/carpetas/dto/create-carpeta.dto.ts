import { Transform } from "class-transformer";
import { IsMongoId, IsNotEmpty, IsOptional, IsString, MaxLength } from "class-validator";
import { recortarTexto } from "../../common/utils/transformaciones.util";

export class CreateCarpetaDto {
    @Transform(recortarTexto)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;

    //si no se envia o va nul, la carpeta se crea en la raiz
     @IsOptional()
     @IsMongoId()
     carpetaPadre?: string;
}