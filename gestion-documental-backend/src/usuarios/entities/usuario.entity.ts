import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { RolUsuario } from '../../common/enums/rol-usuario.enum';

export type UsuarioDocument = HydratedDocument<Usuario>;

@Schema({
  timestamps: true,
  toJSON: {
    transform: (_doc, ret) => {
      delete (ret as Record<string, unknown>).password;
      return ret;
    },
  },
})
export class Usuario {
  @Prop({ required: true, trim: true })
  nombre: string;

  @Prop({ required: true, unique: true, lowercase: true, trim: true })
  correo: string;

  @Prop({ required: true, select: false })
  password: string;

  @Prop({ required: true, enum: RolUsuario, default: RolUsuario.USUARIO })
  rol: RolUsuario;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ default: 0, min: 0 })
  almacenamientoUsado: number;
}

export const UsuarioSchema = SchemaFactory.createForClass(Usuario);