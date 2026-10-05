import { IsMongoId, ValidateIf } from "class-validator";

export class MoverCarpetaDto {
    //si es null = mover a la raiz
    //validateIf: solo aplica IsMongoId cuando el valro no es null
    @ValidateIf((dto: MoverCarpetaDto) => dto.carpetaPadre !== null)
    @IsMongoId()
    carpetaPadre: string | null;
}