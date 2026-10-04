import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';
import { AccionActividad } from '../../common/enums/accion-actividad.enum';
import { TipoRecurso } from '../../common/enums/tipo-recurso.enum';

export class FiltrarActividadesDto {
  @IsOptional()
  @IsMongoId()
  usuario?: string;

  @IsOptional()
  @IsEnum(AccionActividad)
  accion?: AccionActividad;

  @IsOptional()
  @IsEnum(TipoRecurso)
  tipoRecurso?: TipoRecurso;

  @IsOptional()
  @IsMongoId()
  recurso?: string;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  desde?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  hasta?: Date;

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