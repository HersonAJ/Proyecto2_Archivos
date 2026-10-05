import { Transform, Type } from "class-transformer";
import { IsDate, IsEnum, IsInt, IsMongoId, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";
import { OrdenArchivo, SentidoOrden } from "../../common/enums/orden.archivo.enum";
import { recortarTexto } from "../../common/utils/transformaciones.util";
import { TipoArchivo } from "../../common/enums/tipo-archivo.enum";

export class ListarArchivosDto {
    @IsOptional()
    @IsMongoId()
    carpeta?: string;

    @IsOptional()
    @Transform(recortarTexto)
    @IsString()
    @MaxLength(100)
    q?: string; //texto a buscar dentro del nombre

    @IsOptional()
    @IsEnum(TipoArchivo)
    tipo?: TipoArchivo;

    @IsOptional()
    @Transform(({ value } : { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,)
    @IsString()
    @MaxLength(30)
    etiqueta?: string;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    desde?: Date;

    @IsOptional()
    @Type(() => Date)
    @IsDate()
    hasta?: Date;

    @IsOptional()
    @IsEnum(OrdenArchivo)
    orden: OrdenArchivo = OrdenArchivo.CREADO;

    @IsOptional()
    @IsEnum(SentidoOrden)
    sentido: SentidoOrden = SentidoOrden.DESC;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    pagina: number = 1;

    @IsOptional()
    @Type(() => Number)
    @IsInt()
    @Min(1)
    @Max(100)
    limite: number = 20;
}