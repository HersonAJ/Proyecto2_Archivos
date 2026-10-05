import { IsMongoId, ValidateIf } from 'class-validator';

export class MoverArchivoDto {
  // null = mover a la raíz. Si el campo no viene, falla la validación.
  @ValidateIf((dto: MoverArchivoDto) => dto.carpeta !== null)
  @IsMongoId()
  carpeta: string | null;
}