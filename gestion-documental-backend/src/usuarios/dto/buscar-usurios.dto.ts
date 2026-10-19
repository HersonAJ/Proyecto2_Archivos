import { Transform } from 'class-transformer';
import { IsString, MaxLength, MinLength } from 'class-validator';
import { recortarTexto } from '../../common/utils/transformaciones.util';

export class BuscarUsuariosDto {
  @Transform(recortarTexto)
  @IsString()
  @MinLength(2)
  @MaxLength(50)
  q: string;
}
