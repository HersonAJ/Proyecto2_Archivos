import { Type } from "class-transformer";
import { IsDate } from "class-validator";

export class EditarContenidoDto {
    @Type(() => Date)
    @IsDate()
    version: Date;
}