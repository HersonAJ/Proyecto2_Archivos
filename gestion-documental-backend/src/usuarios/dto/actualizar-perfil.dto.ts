import { OmitType } from "@nestjs/mapped-types";
import { UpdateUsuarioDto } from "./update-usuario.dto";

export class ActualizarPerfilDto extends OmitType(UpdateUsuarioDto, [
    'rol',
] as const) {}