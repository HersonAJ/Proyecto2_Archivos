import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';

export class ContenidoArchivoDto {
  @IsOptional()
  @Transform(({ value }: { value: unknown }) => value === 'true' || value === true)
  @IsBoolean()
  descargar?: boolean;
}