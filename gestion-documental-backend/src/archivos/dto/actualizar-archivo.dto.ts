import { Transform } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { recortarTexto } from '../../common/utils/transformaciones.util';

// Para renombrar y/o cambiar etiquetas
export class ActualizarArchivoDto {
  @IsOptional()
  @Transform(recortarTexto)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  nombre?: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @IsString({ each: true })
  @MaxLength(30, { each: true })
  etiquetas?: string[];
}