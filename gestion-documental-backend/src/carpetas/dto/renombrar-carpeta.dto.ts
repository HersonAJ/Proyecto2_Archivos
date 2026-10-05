import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { recortarTexto } from "../../common/utils/transformaciones.util";

export class RenombrarCarpetaDto {
    @Transform(recortarTexto)
    @IsString()
    @IsNotEmpty()
    @MaxLength(100)
    nombre: string;
}