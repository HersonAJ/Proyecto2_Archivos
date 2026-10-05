import { IsMongoId, IsOptional, IsString, MaxLength } from "class-validator";

export class SubirArchivoDto {
    @IsOptional()
    @IsMongoId()
    carpeta?: string;

    @IsOptional()
    @IsString()
    @MaxLength(400)
    etiquetas?: string;
}