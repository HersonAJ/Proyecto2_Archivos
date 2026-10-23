import { Type } from 'class-transformer';
import { IsDate, IsInt, IsMongoId, IsOptional, Max, Min } from 'class-validator';

export class ReporteHistorialDto {
  @IsOptional()
  @IsMongoId()
  usuarioId?: string;

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