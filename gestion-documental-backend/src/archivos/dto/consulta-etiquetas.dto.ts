import { IsMongoId, IsOptional } from 'class-validator';

export class ConsultaEtiquetasDto {

  @IsOptional()
  @IsMongoId()
  carpeta?: string;
}