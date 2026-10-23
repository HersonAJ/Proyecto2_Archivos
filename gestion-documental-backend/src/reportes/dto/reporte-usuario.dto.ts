import { IsMongoId, IsOptional } from 'class-validator';

export class ReportePorUsuarioDto {
  @IsOptional()
  @IsMongoId()
  usuarioId?: string;
}