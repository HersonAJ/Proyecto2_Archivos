import { Transform } from 'class-transformer';
import { IsEmail, IsEnum, IsMongoId } from 'class-validator';
import { NivelPermiso } from '../../common/enums/nivel-permiso.enum';
import { TipoRecurso } from '../../common/enums/tipo-recurso.enum';

export class CompartirDto {
  @IsEnum(TipoRecurso)
  tipoRecurso: TipoRecurso;

  @IsMongoId()
  recurso: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  correo: string;

  @IsEnum(NivelPermiso)
  nivel: NivelPermiso;
}