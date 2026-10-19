import { IsEnum, IsMongoId } from 'class-validator';
import { TipoRecurso } from '../../common/enums/tipo-recurso.enum';

export class ConsultaRecursoDto {
  @IsEnum(TipoRecurso)
  tipoRecurso: TipoRecurso;

  @IsMongoId()
  recurso: string;
}