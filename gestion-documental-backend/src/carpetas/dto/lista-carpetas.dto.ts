import { IsMongoId, IsOptional } from "class-validator";

export class ListarCarpetasDto {
    //si no se envia se litan las carpetas de la raoz
    @IsOptional()
    @IsMongoId()
    padre?: string;
}