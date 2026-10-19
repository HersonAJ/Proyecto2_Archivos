import { IsEnum } from 'class-validator';
import { NivelPermiso } from '../../common/enums/nivel-permiso.enum';

export class CambiarNivelDto {
  @IsEnum(NivelPermiso)
  nivel: NivelPermiso;
}