import { Transform } from "class-transformer";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";
import { recortarTexto } from "../../common/utils/transformaciones.util";

export class CrearComentarioDto {
    @Transform(recortarTexto)
    @IsString()
    @IsNotEmpty()
    @MaxLength(1000)
    texto: string;
}